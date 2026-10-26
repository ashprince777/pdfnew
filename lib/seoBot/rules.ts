/**
 * Pure rules of the SEO bot (no I/O), kept separate so they can be unit tested:
 * guardrails for automatic changes, draft validation, page checks and keyword matching.
 */

/** Page-level Search Console numbers over 28 days. */
export interface PageStats {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

// Guardrails for automatic changes.
/** Enough searches to judge a title by its click rate. */
export const MIN_IMPRESSIONS = 100;
/** Only pages already on the first two result pages. */
export const MAX_POSITION = 20;
/** Rewrite when the click rate is below this share of what the position usually gets. */
export const CTR_RATIO = 0.6;
/** Leave a page alone this long after a change, so Google and the numbers can settle. */
export const COOLDOWN_DAYS = 28;
/** Do not retry a page this long after a change was reverted. */
export const REVERT_BACKOFF_DAYS = 90;
/** At most this many pages change per day. */
export const MAX_CHANGES_PER_RUN = 3;
/** A change is undone if the click rate falls below this share of the rate before it. */
export const REVERT_RATIO = 0.8;

/** Typical organic click rate by position (rounded industry averages). */
export function expectedCtr(position: number): number {
    const curve = [0.28, 0.15, 0.11, 0.08, 0.07, 0.05, 0.04, 0.03, 0.03, 0.025];
    const p = Math.max(1, Math.round(position));
    return p <= 10 ? curve[p - 1] : p <= 20 ? 0.01 : 0.005;
}

/** True when a page earns too few clicks for its position and has enough data to judge. */
export const needsRewrite = (s: PageStats) => s.impressions >= MIN_IMPRESSIONS && s.position <= MAX_POSITION && s.ctr < expectedCtr(s.position) * CTR_RATIO;

export interface Draft {
    title: string;
    description: string;
    reason: string;
}

const BANNED = /(\b(best|number one|guaranteed?|unlimited|world'?s)\b|#1|100% (safe|secure|accurate))/i;

/** Rejects drafts that are too long, spammy or drop the brand; returns why, or null if fine. */
export function validateDraft(draft: Draft, current: { title: string; description: string }): string | null {
    const { title, description } = draft;
    if (typeof title !== 'string' || typeof description !== 'string') return 'missing title or description';
    if (title.length < 30 || title.length > 65) return `title is ${title.length} characters (30-65 allowed)`;
    if (description.length < 110 || description.length > 165) return `description is ${description.length} characters (110-165 allowed)`;
    if (/PDFAdore/.test(current.title) && !/PDFAdore/.test(title)) return 'title dropped the PDFAdore brand';
    if (/[<>{}"]|\p{Extended_Pictographic}/u.test(title + description)) return 'contains markup, quotes or emoji';
    if (BANNED.test(title + ' ' + description)) return 'contains an unverifiable claim (best, #1, guaranteed...)';
    if (/\b[A-Z]{5,}\b/.test(title.replace(/PDFAdore/g, ''))) return 'uses ALL CAPS words';
    if (title === current.title && description === current.description) return 'no change';
    return null;
}

export interface AuditIssue {
    url: string;
    severity: 'error' | 'warning';
    message: string;
}

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
export const pickTag = (html: string, re: RegExp) => {
    const m = html.match(re);
    return m ? decode(m[1]) : null;
};
export const TITLE_RE = /<title>([^<]*)<\/title>/;

/** Checks one page the way a search engine reads it. */
export function checkPage(url: string, status: number, html: string): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const add = (severity: AuditIssue['severity'], message: string) => issues.push({ url, severity, message });
    if (status !== 200) {
        add('error', `Returns HTTP ${status}`);
        return issues;
    }
    const title = pickTag(html, TITLE_RE);
    const description = pickTag(html, /<meta name="description" content="([^"]*)"/);
    const canonical = pickTag(html, /<link rel="canonical" href="([^"]*)"/);
    const h1s = html.match(/<h1[\s>]/g)?.length ?? 0;
    if (!title) add('error', 'Missing <title>');
    else if (title.length > 65) add('warning', `Title is ${title.length} characters; Google usually cuts it after ~60`);
    else if (title.length < 25) add('warning', `Title is only ${title.length} characters`);
    if (!description) add('error', 'Missing meta description');
    else if (description.length > 165) add('warning', `Description is ${description.length} characters; it will be cut off`);
    else if (description.length < 70) add('warning', `Description is only ${description.length} characters`);
    if (!canonical) add('error', 'Missing canonical link');
    else if (canonical.replace(/\/$/, '') !== url.replace(/\/$/, '')) add('warning', `Canonical points elsewhere: ${canonical}`);
    if (h1s !== 1) add('warning', `${h1s} H1 headings (expected 1)`);
    if (/<meta name="robots" content="[^"]*noindex/.test(html)) add('error', 'Page is set to noindex but is in the sitemap');
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
        try {
            JSON.parse(m[1]);
        } catch {
            add('error', 'Invalid JSON-LD structured data');
        }
    }
    return issues;
}

const STOP = new Set(['to', 'in', 'a', 'the', 'for', 'of', 'and', 'online', 'free', 'file', 'files', 'how', 'with']);
const words = (text: string) =>
    text
        .toLowerCase()
        .replace(/(\d+)\s*(kb|mb)/g, '$1$2')
        .replace(/[^a-z0-9 ]+/g, ' ')
        .split(/\s+/)
        .filter((w) => w && !STOP.has(w));

/** True when one of the titles contains every meaningful word of the keyword ("1 mb" matches "1MB"). */
export function keywordCovered(keyword: string, titles: string[]): boolean {
    const needed = words(keyword);
    return needed.length > 0 && titles.some((t) => {
        const have = ` ${words(t).join(' ')} `;
        return needed.every((w) => have.includes(` ${w} `));
    });
}
