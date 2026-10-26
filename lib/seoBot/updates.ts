import 'server-only';

/** A Google Search ranking update (Search Status Dashboard) or a Search Central blog post. */
export interface SearchUpdate {
    id: string;
    source: 'status' | 'blog';
    title: string;
    url: string;
    published_at: string | null;
    ended_at: string | null;
}

const LOOKBACK_DAYS = 90;

/** Official ranking updates (core, spam, reviews...) with their rollout dates. */
async function statusDashboard(): Promise<SearchUpdate[]> {
    const res = await fetch('https://status.search.google.com/incidents.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Search Status Dashboard: HTTP ${res.status}`);
    const incidents = (await res.json()) as { id: string; external_desc: string; begin: string; end?: string | null; uri?: string }[];
    return incidents.map((i) => ({
        id: `status:${i.id}`,
        source: 'status' as const,
        title: i.external_desc,
        url: i.uri ? `https://status.search.google.com/${i.uri.replace(/^\//, '')}` : 'https://status.search.google.com/summary',
        published_at: i.begin,
        ended_at: i.end ?? null,
    }));
}

/** Google Search Central blog: guidance and announcements. */
async function searchCentralBlog(): Promise<SearchUpdate[]> {
    const res = await fetch('https://feeds.feedburner.com/blogspot/amDG', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Search Central blog: HTTP ${res.status}`);
    const xml = await res.text();
    const field = (item: string, tag: string) => item.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`))?.[1]?.trim() ?? '';
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
        const link = field(item, 'link');
        const date = field(item, 'pubDate');
        return {
            id: `blog:${field(item, 'guid') || link}`,
            source: 'blog' as const,
            title: field(item, 'title').replace(/&amp;/g, '&'),
            url: link,
            published_at: date ? new Date(date).toISOString() : null,
            ended_at: null,
        };
    });
}

/** Updates from the last 90 days, newest first. */
export async function fetchSearchUpdates(): Promise<SearchUpdate[]> {
    const since = Date.now() - LOOKBACK_DAYS * 86_400_000;
    const results = await Promise.allSettled([statusDashboard(), searchCentralBlog()]);
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length === results.length) throw (failed[0] as PromiseRejectedResult).reason;
    return results
        .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
        .filter((u) => !u.published_at || new Date(u.published_at).getTime() >= since)
        .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''));
}
