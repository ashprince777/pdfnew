import 'server-only';
import { SITE } from '../site';
import { checkPage, pickTag, TITLE_RE, type AuditIssue } from './rules';

export type { AuditIssue };

const USER_AGENT = 'Mozilla/5.0 (compatible; PDFAdoreSEOBot/1.0; +https://www.pdfadore.com)';
const CONCURRENCY = 6;

/** Crawls every URL in the live sitemap and reports technical SEO problems. */
export async function auditSite(): Promise<{ checked: number; issues: AuditIssue[] }> {
    const issues: AuditIssue[] = [];
    const robots = await fetch(`${SITE.url}/robots.txt`, { headers: { 'User-Agent': USER_AGENT }, cache: 'no-store' });
    if (!robots.ok) issues.push({ url: `${SITE.url}/robots.txt`, severity: 'error', message: `robots.txt returns HTTP ${robots.status}` });
    else if (!/sitemap:/i.test(await robots.text())) issues.push({ url: `${SITE.url}/robots.txt`, severity: 'warning', message: 'robots.txt does not list the sitemap' });

    const sitemap = await (await fetch(`${SITE.url}/sitemap.xml`, { headers: { 'User-Agent': USER_AGENT }, cache: 'no-store' })).text();
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    if (urls.length === 0) issues.push({ url: `${SITE.url}/sitemap.xml`, severity: 'error', message: 'Sitemap has no URLs' });

    const titles = new Map<string, string[]>();
    let next = 0;
    await Promise.all(
        Array.from({ length: CONCURRENCY }, async () => {
            while (next < urls.length) {
                const url = urls[next++];
                try {
                    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(15000) });
                    const html = res.status === 200 ? await res.text() : '';
                    issues.push(...checkPage(url, res.status, html));
                    const title = pickTag(html, TITLE_RE);
                    if (title) titles.set(title, [...(titles.get(title) ?? []), url]);
                } catch (error) {
                    issues.push({ url, severity: 'error', message: `Could not load: ${(error as Error).message}` });
                }
            }
        })
    );
    for (const [title, pages] of titles) {
        if (pages.length > 1) issues.push({ url: pages.join(', '), severity: 'warning', message: `Duplicate title "${title}"` });
    }
    return { checked: urls.length, issues };
}
