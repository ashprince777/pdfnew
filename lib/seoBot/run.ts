import 'server-only';
import { revalidateTag } from 'next/cache';
import { getSupabaseAdmin } from '../supabase/server';
import { PAGE_SEO, BLOG_SEO, type PageSeo } from '../seo';
import { getArticle } from '../blog';
import { SITE } from '../site';
import { SEO_OVERRIDES_TAG } from '../seoOverrides';
import { gscQueries, isGscConfigured, isoDay } from './gsc';
import { auditSite, type AuditIssue } from './audit';
import { fetchSearchUpdates } from './updates';
import { fetchKeywordIdeas, isCovered } from './keywords';
import { draftRewrite, noteForUpdate } from './rewrite';
import { COOLDOWN_DAYS, MAX_CHANGES_PER_RUN, REVERT_BACKOFF_DAYS, REVERT_RATIO, MIN_IMPRESSIONS, expectedCtr, needsRewrite, validateDraft, type PageStats } from './rules';

const DAY = 86_400_000;
/** Same key as public/<key>.txt, so search engines accept the change notifications. */
const INDEXNOW_KEY = '54a8e380c82e43f0a6321d74b036e357';
/** New ranking updates explained by AI per run (keeps within Groq's free per-minute allowance). */
const MAX_UPDATE_NOTES = 3;

/** Steps in the order they run (the database does not keep the order of JSON keys). */
export const STEP_ORDER = ['Search Console', 'Check earlier changes', 'Rewrite titles', 'Site audit', 'Google updates', 'Keyword ideas'];

export interface StepResult {
    status: 'ok' | 'failed' | 'skipped';
    note: string;
}

export interface RunSummary {
    trigger: 'cron' | 'manual';
    steps: Record<string, StepResult>;
    audit?: { checked: number; issues: AuditIssue[] };
    rewrites?: { path: string; outcome: string }[];
}

interface ChangeRow {
    id: number;
    path: string;
    old_title: string;
    old_description: string;
    new_title: string;
    new_description: string;
    before: PageStats;
    status: string;
    created_at: string;
}

/** The title and description a path has in code (before any bot override). */
export function defaultSeo(path: string): PageSeo | null {
    if (PAGE_SEO[path]) return PAGE_SEO[path];
    const slug = path.match(/^\/blog\/([^/]+)$/)?.[1];
    const article = slug ? getArticle(slug) : undefined;
    return article ? (BLOG_SEO[article.slug] ?? { title: article.title, description: article.description }) : null;
}

/** Search Console page URL -> site path ('/' for the home page); null for other hosts. */
function toPath(page: string): string | null {
    try {
        const url = new URL(page);
        if (url.hostname !== new URL(SITE.url).hostname) return null;
        return url.pathname.replace(/\/$/, '') || '/';
    } catch {
        return null;
    }
}

async function pingIndexNow(paths: string[]) {
    const host = new URL(SITE.url).hostname;
    await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `${SITE.url}/${INDEXNOW_KEY}.txt`, urlList: paths.map((p) => (p === '/' ? SITE.url : `${SITE.url}${p}`)) }),
    }).catch(() => {});
}

/** Restores a page's previous wording after a change is undone (by the bot or an admin). */
export async function revertChange(change: Pick<ChangeRow, 'id' | 'path' | 'old_title' | 'old_description'>, note: string) {
    const db = getSupabaseAdmin();
    const original = defaultSeo(change.path);
    if (original && original.title === change.old_title && original.description === change.old_description) {
        await db.from('seo_overrides').delete().eq('path', change.path);
    } else {
        await db.from('seo_overrides').upsert({ path: change.path, title: change.old_title, description: change.old_description, updated_at: new Date().toISOString() });
    }
    await db.from('seo_changes').update({ status: 'reverted', note, evaluated_at: new Date().toISOString() }).eq('id', change.id);
}

/**
 * One daily pass: sync Search Console, judge and undo earlier changes, rewrite under-performing
 * titles (within the guardrails in rewrite.ts), audit the live site, read Google's update feeds
 * and collect keyword ideas. Each step is independent: a failure is recorded and the rest continue.
 */
export async function runSeoBot(trigger: RunSummary['trigger']): Promise<{ runId: number; summary: RunSummary }> {
    const db = getSupabaseAdmin();
    const { data: run, error } = await db.from('seo_runs').insert({}).select('id').single();
    if (error || !run) throw new Error(`Could not start SEO run: ${error?.message}`);
    const summary: RunSummary = { trigger, steps: {} };
    const step = async (name: string, fn: () => Promise<string | StepResult>) => {
        try {
            const result = await fn();
            summary.steps[name] = typeof result === 'string' ? { status: 'ok', note: result } : result;
        } catch (err) {
            summary.steps[name] = { status: 'failed', note: (err as Error).message };
        }
    };

    const pageStats = new Map<string, PageStats>();
    const pageQueries = new Map<string, { query: string; impressions: number; clicks: number; position: number }[]>();
    const changedPaths = new Set<string>();

    await step('Search Console', async () => {
        if (!isGscConfigured()) return { status: 'skipped', note: 'Not connected yet: add GSC_CLIENT_EMAIL and GSC_PRIVATE_KEY in Vercel.' };
        const [daily, pages, queries] = await gscQueries([
            // dataState 'all' includes the freshest (still provisional) days, so totals match the daily rows.
            { startDate: isoDay(6), endDate: isoDay(1), dimensions: ['date', 'query', 'page'] },
            { startDate: isoDay(28), endDate: isoDay(1), dimensions: ['page'] },
            { startDate: isoDay(28), endDate: isoDay(1), dimensions: ['page', 'query'], rowLimit: 5000 },
        ]);
        const rows = daily
            .map((r) => ({ day: r.keys[0], query: r.keys[1], page: toPath(r.keys[2]), clicks: r.clicks, impressions: r.impressions, position: r.position }))
            .filter((r) => r.page);
        for (let i = 0; i < rows.length; i += 500) {
            const { error: upsertError } = await db.from('seo_query_stats').upsert(rows.slice(i, i + 500));
            if (upsertError) throw new Error(upsertError.message);
        }
        await db.from('seo_query_stats').delete().lt('day', isoDay(400));
        for (const r of pages) {
            const path = toPath(r.keys[0]);
            if (path) pageStats.set(path, { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position });
        }
        for (const r of queries) {
            const path = toPath(r.keys[0]);
            if (!path) continue;
            pageQueries.set(path, [...(pageQueries.get(path) ?? []), { query: r.keys[1], impressions: r.impressions, clicks: r.clicks, position: r.position }]);
        }
        pageQueries.forEach((list) => list.sort((a, b) => b.impressions - a.impressions));
        const impressions = [...pageStats.values()].reduce((s, p) => s + p.impressions, 0);
        return `${rows.length} daily rows saved; ${pageStats.size} pages with ${impressions.toLocaleString('en-IN')} impressions in 28 days.`;
    });

    await step('Check earlier changes', async () => {
        if (!pageStats.size) return { status: 'skipped', note: 'Needs Search Console data.' };
        const { data } = await db
            .from('seo_changes')
            .select('*')
            .eq('status', 'live')
            .lt('created_at', new Date(Date.now() - (COOLDOWN_DAYS + 3) * DAY).toISOString());
        let kept = 0;
        let reverted = 0;
        for (const change of (data ?? []) as ChangeRow[]) {
            const after = pageStats.get(change.path);
            const ageDays = (Date.now() - new Date(change.created_at).getTime()) / DAY;
            if (!after || after.impressions < MIN_IMPRESSIONS) {
                if (ageDays > 90) {
                    await db.from('seo_changes').update({ status: 'kept', note: 'Not enough searches to measure after 90 days.', evaluated_at: new Date().toISOString() }).eq('id', change.id);
                    kept++;
                }
                continue;
            }
            await db.from('seo_changes').update({ after }).eq('id', change.id);
            if (after.ctr < change.before.ctr * REVERT_RATIO) {
                await revertChange(change, `Undone automatically: click rate fell from ${(change.before.ctr * 100).toFixed(1)}% to ${(after.ctr * 100).toFixed(1)}%.`);
                changedPaths.add(change.path);
                reverted++;
            } else {
                await db
                    .from('seo_changes')
                    .update({ status: 'kept', note: `Kept: click rate ${(change.before.ctr * 100).toFixed(1)}% → ${(after.ctr * 100).toFixed(1)}%.`, evaluated_at: new Date().toISOString() })
                    .eq('id', change.id);
                kept++;
            }
        }
        return `${kept} kept, ${reverted} undone.`;
    });

    await step('Rewrite titles', async () => {
        if (!pageStats.size) return { status: 'skipped', note: 'Needs Search Console data.' };
        if (!process.env.GROQ_API_KEY) return { status: 'skipped', note: 'GROQ_API_KEY is not set.' };
        const [{ data: overrideRows }, { data: recent }] = await Promise.all([
            db.from('seo_overrides').select('path, title, description'),
            db.from('seo_changes').select('path, status, created_at').gt('created_at', new Date(Date.now() - REVERT_BACKOFF_DAYS * DAY).toISOString()),
        ]);
        const overrides = new Map((overrideRows ?? []).map((o) => [o.path as string, o as PageSeo]));
        const blocked = new Set(
            (recent ?? [])
                .filter((c) => c.status === 'reverted' || Date.now() - new Date(c.created_at).getTime() < COOLDOWN_DAYS * DAY)
                .map((c) => c.path as string)
        );
        const candidates = [...pageStats]
            .filter(([path]) => defaultSeo(path) && !blocked.has(path) && !changedPaths.has(path))
            .filter(([, s]) => needsRewrite(s))
            .map(([path, s]) => ({ path, stats: s, missed: s.impressions * (expectedCtr(s.position) - s.ctr) }))
            .sort((a, b) => b.missed - a.missed)
            .slice(0, MAX_CHANGES_PER_RUN);
        summary.rewrites = [];
        for (const { path, stats } of candidates) {
            const current = overrides.get(path) ?? defaultSeo(path)!;
            try {
                const draft = await draftRewrite({ path, current, stats, queries: pageQueries.get(path) ?? [] });
                const problem = validateDraft(draft, current);
                if (problem) {
                    summary.rewrites.push({ path, outcome: `Skipped: AI draft rejected (${problem}).` });
                    continue;
                }
                await db.from('seo_overrides').upsert({ path, title: draft.title, description: draft.description, updated_at: new Date().toISOString() });
                await db.from('seo_changes').insert({
                    path,
                    old_title: current.title,
                    old_description: current.description,
                    new_title: draft.title,
                    new_description: draft.description,
                    reason: draft.reason || 'Click rate below what its position usually gets.',
                    before: stats,
                });
                changedPaths.add(path);
                summary.rewrites.push({ path, outcome: `Changed title to "${draft.title}".` });
            } catch (err) {
                summary.rewrites.push({ path, outcome: `Skipped: ${(err as Error).message}` });
            }
        }
        return candidates.length ? `${summary.rewrites.filter((r) => r.outcome.startsWith('Changed')).length} of ${candidates.length} pages rewritten.` : 'No page needs a new title today.';
    });

    if (changedPaths.size) {
        revalidateTag(SEO_OVERRIDES_TAG, 'max');
        await pingIndexNow([...changedPaths]);
    }

    await step('Site audit', async () => {
        summary.audit = await auditSite();
        const errors = summary.audit.issues.filter((i) => i.severity === 'error').length;
        return `${summary.audit.checked} pages checked: ${errors} errors, ${summary.audit.issues.length - errors} warnings.`;
    });

    await step('Google updates', async () => {
        const updates = await fetchSearchUpdates();
        const { data: known } = await db.from('seo_updates').select('id');
        const knownIds = new Set((known ?? []).map((k) => k.id as string));
        const fresh = updates.filter((u) => !knownIds.has(u.id));
        let noted = 0;
        for (const update of fresh) {
            let note: string | null = null;
            if (update.source === 'status' && noted < MAX_UPDATE_NOTES && process.env.GROQ_API_KEY) {
                note = await noteForUpdate(update.title, update.url).catch(() => null);
                noted++;
            }
            await db.from('seo_updates').upsert({ ...update, note });
        }
        // Rollouts that have since finished.
        for (const update of updates.filter((u) => u.ended_at && knownIds.has(u.id))) {
            await db.from('seo_updates').update({ ended_at: update.ended_at }).eq('id', update.id);
        }
        const rolling = updates.filter((u) => u.source === 'status' && !u.ended_at);
        return `${fresh.length} new${rolling.length ? `; rolling out now: ${rolling.map((u) => u.title).join(', ')}` : ''}.`;
    });

    await step('Keyword ideas', async () => {
        const ideas = await fetchKeywordIdeas();
        const today = isoDay(0);
        const rows = ideas.map((i) => ({ keyword: i.keyword, seed: i.seed, covered: isCovered(i.keyword), last_seen: today }));
        if (rows.length) {
            const { error: upsertError } = await db.from('seo_keywords').upsert(rows);
            if (upsertError) throw new Error(upsertError.message);
        }
        return `${rows.length} suggestions; ${rows.filter((r) => !r.covered).length} not yet targeted by a page title.`;
    });

    const failed = Object.values(summary.steps).some((s) => s.status === 'failed');
    await db.from('seo_runs').update({ finished_at: new Date().toISOString(), status: failed ? 'failed' : 'ok', summary }).eq('id', run.id);
    return { runId: run.id as number, summary };
}
