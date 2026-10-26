import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser, getSupabaseAdmin } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { isGscConfigured, isoDay } from '@/lib/seoBot/gsc';
import { TARGET_KEYWORDS } from '@/lib/seoBot/keywords';
import { CTR_RATIO, MIN_IMPRESSIONS, expectedCtr, needsRewrite } from '@/lib/seoBot/rules';
import { STEP_ORDER, type RunSummary } from '@/lib/seoBot/run';
import Tile from '../Tile';
import RunNowButton from './RunNowButton';
import { runSeoBotNow, undoSeoChange } from './actions';
import styles from '../Admin.module.css';
import seo from './SeoAdmin.module.css';

export const metadata: Metadata = {
    title: 'SEO bot',
    robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';
// "Run now" runs the whole bot inside the server action.
export const maxDuration = 300;

interface StatRow {
    day: string;
    query: string;
    page: string;
    clicks: number;
    impressions: number;
    position: number;
}

const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—';
const fmtTime = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const num = (n: number) => n.toLocaleString('en-IN');

/** Sums rows into clicks, impressions, CTR and impression-weighted average position. */
function aggregate(rows: StatRow[]) {
    const clicks = rows.reduce((s, r) => s + r.clicks, 0);
    const impressions = rows.reduce((s, r) => s + r.impressions, 0);
    const position = impressions ? rows.reduce((s, r) => s + r.position * r.impressions, 0) / impressions : 0;
    return { clicks, impressions, ctr: impressions ? clicks / impressions : 0, position };
}

function groupBy(rows: StatRow[], key: (r: StatRow) => string) {
    const groups = new Map<string, StatRow[]>();
    for (const r of rows) groups.set(key(r), [...(groups.get(key(r)) ?? []), r]);
    return groups;
}

async function loadStats(db: ReturnType<typeof getSupabaseAdmin>, since: string): Promise<StatRow[]> {
    const rows: StatRow[] = [];
    for (let from = 0; from < 100_000; from += 1000) {
        const { data } = await db.from('seo_query_stats').select('day, query, page, clicks, impressions, position').gte('day', since).range(from, from + 999);
        rows.push(...((data ?? []) as StatRow[]));
        if (!data || data.length < 1000) break;
    }
    return rows;
}

function Badge({ status }: { status: string }) {
    return <span className={`${seo.badge} ${seo[status] ?? ''}`}>{status}</span>;
}

export default async function SeoAdminPage() {
    const user = await getCurrentUser();
    if (!isAdminEmail(user?.email)) notFound();

    const db = getSupabaseAdmin();
    const [runRes, stats, changesRes, updatesRes, keywordsRes] = await Promise.all([
        db.from('seo_runs').select('*').order('started_at', { ascending: false }).limit(1),
        loadStats(db, isoDay(30)),
        db.from('seo_changes').select('*').order('created_at', { ascending: false }).limit(30),
        db.from('seo_updates').select('*').order('published_at', { ascending: false, nullsFirst: false }).limit(20),
        db.from('seo_keywords').select('keyword, seed, first_seen').eq('covered', false).order('first_seen', { ascending: false }).order('keyword').limit(40),
    ]);
    const lastRun = runRes.data?.[0] as { started_at: string; finished_at: string | null; status: string; summary: RunSummary } | undefined;
    const changes = (changesRes.data ?? []) as {
        id: number;
        path: string;
        old_title: string;
        new_title: string;
        new_description: string;
        reason: string;
        status: string;
        note: string | null;
        created_at: string;
        before: { ctr: number; position: number; impressions: number };
        after: { ctr: number } | null;
    }[];
    const updates = (updatesRes.data ?? []) as { id: string; source: string; title: string; url: string; published_at: string | null; ended_at: string | null; note: string | null }[];
    const ideas = (keywordsRes.data ?? []) as { keyword: string; seed: string; first_seen: string }[];
    const tableMissing = Boolean(runRes.error);

    // Search performance
    const total = aggregate(stats);
    const last7 = (r: StatRow) => r.day >= isoDay(8);
    const prev7 = (r: StatRow) => r.day < isoDay(8) && r.day >= isoDay(15);
    const queries = [...groupBy(stats, (r) => r.query)]
        .map(([query, rows]) => {
            const now = aggregate(rows.filter(last7));
            const before = aggregate(rows.filter(prev7));
            return { query, ...aggregate(rows), trend: now.impressions && before.impressions ? before.position - now.position : null };
        })
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 25);
    const pages = [...groupBy(stats, (r) => r.page)]
        .map(([page, rows]) => ({ page, ...aggregate(rows) }))
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 20);
    const byQuery = groupBy(stats, (r) => r.query.toLowerCase());
    const targets = TARGET_KEYWORDS.map((t) => ({ ...t, ...aggregate(byQuery.get(t.keyword) ?? []) }));
    const rolling = updates.filter((u) => u.source === 'status' && !u.ended_at);
    const audit = lastRun?.summary?.audit;

    return (
        <div className={`container ${styles.page}`}>
            <header className={styles.header}>
                <h1>SEO bot</h1>
                <p className={styles.muted}>
                    Runs every day at 7:00 IST: reads Google Search Console, rewrites titles that get too few clicks, checks every page, watches Google
                    updates and collects keyword ideas.
                </p>
                <nav className={styles.subnav} aria-label="Admin sections">
                    <Link href="/admin">Overview</Link>
                    <span aria-current="page">SEO bot</span>
                </nav>
            </header>

            {tableMissing && (
                <p className={seo.alert} role="alert">
                    The SEO tables are not in the database yet. Run supabase/migrations/0004_seo_bot.sql in the Supabase SQL editor.
                </p>
            )}

            <section className={styles.card}>
                <div className={seo.cardHead}>
                    <h2 className={styles.cardTitle}>Last run</h2>
                    <form action={runSeoBotNow}>
                        <RunNowButton />
                    </form>
                </div>
                {lastRun ? (
                    <>
                        <p className={styles.muted}>
                            {fmtTime(lastRun.started_at)} IST · <Badge status={lastRun.status} /> · {lastRun.summary?.trigger === 'manual' ? 'started from this page' : 'daily schedule'}
                        </p>
                        <ul className={seo.steps}>
                            {Object.entries(lastRun.summary?.steps ?? {})
                                .sort(([a], [b]) => STEP_ORDER.indexOf(a) - STEP_ORDER.indexOf(b))
                                .map(([name, s]) => (
                                <li key={name}>
                                    <Badge status={s.status} /> <strong>{name}</strong>: {s.note}
                                </li>
                            ))}
                        </ul>
                        {lastRun.summary?.rewrites?.length ? (
                            <ul className={seo.steps}>
                                {lastRun.summary.rewrites.map((r) => (
                                    <li key={r.path}>
                                        <code>{r.path}</code> {r.outcome}
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </>
                ) : (
                    <p className={styles.muted}>No runs yet. The first one happens at 7:00 IST, or press Run now.</p>
                )}
                {!isGscConfigured() && (
                    <p className={seo.alert}>
                        Google Search Console is not connected, so rankings, clicks and automatic title changes are off. Add GSC_CLIENT_EMAIL and
                        GSC_PRIVATE_KEY in Vercel (see docs/SEO-BOT.md).
                    </p>
                )}
            </section>

            <h2 className={styles.section}>Google search, last 28 days</h2>
            <div className={styles.tiles}>
                <Tile label="Clicks" value={num(total.clicks)} />
                <Tile label="Impressions" value={num(total.impressions)} note="times a page appeared in results" />
                <Tile label="Click rate" value={pct(total.ctr)} />
                <Tile label="Average position" value={total.impressions ? total.position.toFixed(1) : '—'} note="1 = top of Google" />
            </div>

            <div className={styles.twoCol}>
                <section className={styles.card}>
                    <h2 className={styles.cardTitle}>Target keywords</h2>
                    <p className={styles.muted}>Keywords each page was written for, with India search volume and where we rank now.</p>
                    <table className={styles.table}>
                        <thead>
                            <tr><th>Keyword</th><th>Searches/mo</th><th>Position</th><th>Clicks</th></tr>
                        </thead>
                        <tbody>
                            {targets.map((t) => (
                                <tr key={t.keyword}>
                                    <td>
                                        <a href={t.path} className={seo.link}>{t.keyword}</a>
                                    </td>
                                    <td>{num(t.volume)}</td>
                                    <td>{t.impressions ? t.position.toFixed(1) : <span className={styles.muted}>not yet</span>}</td>
                                    <td>{t.clicks || ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                <section className={styles.card}>
                    <h2 className={styles.cardTitle}>Top searches</h2>
                    <p className={styles.muted}>What people searched when they saw PDFAdore. Trend compares the last 7 days with the 7 before.</p>
                    {queries.length === 0 ? (
                        <p className={styles.muted}>No Search Console data yet.</p>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr><th>Search</th><th>Impr.</th><th>Clicks</th><th>Position</th></tr>
                            </thead>
                            <tbody>
                                {queries.map((q) => (
                                    <tr key={q.query}>
                                        <td>{q.query}</td>
                                        <td>{num(q.impressions)}</td>
                                        <td>{q.clicks}</td>
                                        <td>
                                            {q.position.toFixed(1)}{' '}
                                            {q.trend !== null && Math.abs(q.trend) >= 0.5 && (
                                                <span className={q.trend > 0 ? seo.up : seo.down} title={q.trend > 0 ? 'moved up' : 'moved down'}>
                                                    {q.trend > 0 ? '▲' : '▼'} {Math.abs(q.trend).toFixed(1)}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            </div>

            <section className={styles.card}>
                <h2 className={styles.cardTitle}>Pages</h2>
                <p className={styles.muted}>
                    Flagged pages get a click rate under {Math.round(CTR_RATIO * 100)}% of what their position usually earns, with at least {MIN_IMPRESSIONS}{' '}
                    impressions; the bot rewrites up to 3 of them a day.
                </p>
                {pages.length === 0 ? (
                    <p className={styles.muted}>No Search Console data yet.</p>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr><th>Page</th><th>Impr.</th><th>Clicks</th><th>Click rate</th><th>Typical</th><th>Position</th></tr>
                        </thead>
                        <tbody>
                            {pages.map((p) => {
                                const flagged = needsRewrite(p);
                                return (
                                    <tr key={p.page}>
                                        <td><a href={p.page} className={seo.link}>{p.page}</a></td>
                                        <td>{num(p.impressions)}</td>
                                        <td>{p.clicks}</td>
                                        <td className={flagged ? seo.down : undefined}>{pct(p.ctr)}{flagged ? ' ⚑' : ''}</td>
                                        <td>{pct(expectedCtr(p.position))}</td>
                                        <td>{p.position.toFixed(1)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </section>

            <section className={styles.card}>
                <h2 className={styles.cardTitle}>Automatic title changes</h2>
                <p className={styles.muted}>
                    Each change is measured after 4 weeks: kept if the click rate held up, undone automatically if it fell by more than 20%. You can undo
                    any change yourself.
                </p>
                {changes.length === 0 ? (
                    <p className={styles.muted}>No changes yet.</p>
                ) : (
                    <ul className={seo.changes}>
                        {changes.map((c) => (
                            <li key={c.id}>
                                <div className={seo.cardHead}>
                                    <span>
                                        <Badge status={c.status} /> <a href={c.path} className={seo.link}>{c.path}</a> · {fmtDate(c.created_at)}
                                    </span>
                                    {c.status === 'live' && (
                                        <form action={undoSeoChange}>
                                            <input type="hidden" name="id" value={c.id} />
                                            <button type="submit" className="btn btn-outline" style={{ padding: '4px 12px', fontSize: 'var(--text-sm)' }}>
                                                Undo
                                            </button>
                                        </form>
                                    )}
                                </div>
                                <p className={seo.old}>{c.old_title}</p>
                                <p className={seo.new}>{c.new_title}</p>
                                <p className={styles.muted}>{c.new_description}</p>
                                <p className={styles.muted}>
                                    {c.reason} Before: {pct(c.before.ctr)} click rate at position {c.before.position?.toFixed(1)}
                                    {c.after ? `; after: ${pct(c.after.ctr)}` : ''}. {c.note}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <div className={styles.twoCol}>
                <section className={styles.card}>
                    <h2 className={styles.cardTitle}>Google updates</h2>
                    {rolling.length > 0 && (
                        <p className={seo.alert}>
                            Rolling out now: {rolling.map((u) => u.title).join(', ')}. Rankings can swing for a few weeks; avoid big page changes until it ends.
                        </p>
                    )}
                    {updates.length === 0 ? (
                        <p className={styles.muted}>Nothing in the last 90 days yet.</p>
                    ) : (
                        <ul className={seo.changes}>
                            {updates.map((u) => (
                                <li key={u.id}>
                                    <a href={u.url} target="_blank" rel="noopener noreferrer" className={seo.link}>{u.title}</a>
                                    <p className={styles.muted}>
                                        {u.source === 'status' ? 'Ranking update' : 'Search Central blog'} · {fmtDate(u.published_at)}
                                        {u.source === 'status' && (u.ended_at ? ` – ${fmtDate(u.ended_at)}` : ' · rolling out')}
                                    </p>
                                    {u.note && <p className={seo.note}>{u.note}</p>}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className={styles.card}>
                    <h2 className={styles.cardTitle}>Keyword ideas</h2>
                    <p className={styles.muted}>
                        Google autocomplete suggestions (India) that no page title targets yet. Good ones can become a new page or guide; ask Claude to build
                        it.
                    </p>
                    {ideas.length === 0 ? (
                        <p className={styles.muted}>None yet.</p>
                    ) : (
                        <ul className={seo.ideas}>
                            {ideas.map((i) => (
                                <li key={i.keyword} title={`from "${i.seed}", first seen ${fmtDate(i.first_seen)}`}>{i.keyword}</li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <section className={styles.card}>
                <h2 className={styles.cardTitle}>Site check</h2>
                {!audit ? (
                    <p className={styles.muted}>Runs with the bot.</p>
                ) : audit.issues.length === 0 ? (
                    <p>All {audit.checked} pages in the sitemap passed: titles, descriptions, canonical links, headings and structured data.</p>
                ) : (
                    <>
                        <p className={styles.muted}>{audit.checked} pages checked.</p>
                        <table className={styles.table}>
                            <thead><tr><th>Severity</th><th>Page</th><th>Problem</th></tr></thead>
                            <tbody>
                                {audit.issues.map((i, n) => (
                                    <tr key={n}>
                                        <td><Badge status={i.severity} /></td>
                                        <td className={styles.email} title={i.url}>{i.url.replace(/^https:\/\/www\.pdfadore\.com/, '') || '/'}</td>
                                        <td>{i.message}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
            </section>
        </div>
    );
}
