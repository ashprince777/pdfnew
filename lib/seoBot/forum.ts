import 'server-only';
import { AI_MODEL, getGroq } from '../ai/server';
import { ALL_TOOLS } from '../tools';
import { SITE } from '../site';
import { PAGE_SEO } from '../seo';
import { KERALA_PSC, SSC } from '../examPhotos';
import { IMAGE_SIZE_PRESETS_KB, JPG_PDF_SIZE_PRESETS_KB, SIZE_PRESETS_KB, sizeSlug } from '../compressSizes';
import { FORUM_QUERIES, draftProblem, isWorthAnswering } from './forumRules';

/**
 * Forum helper: finds questions people asked on Reddit that the site's tools solve, and drafts a
 * helpful answer for the owner to review and post by hand. It never posts anything itself.
 * Reddit needs an app login (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET): anonymous searches are blocked.
 */

export const isRedditConfigured = () => Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET);

const USER_AGENT = 'web:pdfadore-forum-helper:1.0 (read-only search)';

export interface ForumThread {
    id: string;
    url: string;
    title: string;
    body: string;
    community: string;
    posted_at: string;
    query: string;
}

async function redditToken(): Promise<string> {
    const auth = Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64');
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
        body: 'grant_type=client_credentials',
        cache: 'no-store',
    });
    const data = (await res.json()) as { access_token?: string; error?: string };
    if (!data.access_token) throw new Error(`Reddit login failed: ${data.error ?? res.status}`);
    return data.access_token;
}

interface RedditPost {
    name: string;
    title: string;
    selftext: string;
    subreddit: string;
    permalink: string;
    created_utc: number;
    num_comments: number;
    locked: boolean;
    archived: boolean;
    over_18: boolean;
}

/** Recent Reddit questions worth answering, newest first, without duplicates. */
export async function findRedditThreads(): Promise<ForumThread[]> {
    const token = await redditToken();
    const found = new Map<string, ForumThread>();
    for (const query of FORUM_QUERIES) {
        const res = await fetch(`https://oauth.reddit.com/search?q=${encodeURIComponent(query)}&sort=new&t=week&limit=15&type=link`, {
            headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
            cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Reddit search: HTTP ${res.status}`);
        const data = (await res.json()) as { data?: { children?: { data: RedditPost }[] } };
        for (const { data: post } of data.data?.children ?? []) {
            const ageDays = (Date.now() / 1000 - post.created_utc) / 86_400;
            const candidate = { title: post.title, body: post.selftext ?? '', ageDays, comments: post.num_comments, locked: post.locked || post.archived || post.over_18 };
            if (found.has(post.name) || !isWorthAnswering(candidate)) continue;
            found.set(post.name, {
                id: `reddit:${post.name}`,
                url: `https://www.reddit.com${post.permalink}`,
                title: post.title,
                body: (post.selftext ?? '').slice(0, 2000),
                community: `r/${post.subreddit}`,
                posted_at: new Date(post.created_utc * 1000).toISOString(),
                query,
            });
        }
    }
    return [...found.values()].sort((a, b) => b.posted_at.localeCompare(a.posted_at));
}

/** What the site offers, with real URLs and the official exam rules, so the draft never invents either. */
function siteFacts(): string {
    const url = (path: string) => `${SITE.url}${path}`;
    const describe = (path: string) => (PAGE_SEO[path] ? ` ${PAGE_SEO[path].description}` : '');
    const tools = ALL_TOOLS.filter((t) => t.access !== 'premium').map((t) => `- ${t.title} (${url(t.href)}): ${t.description}`);
    const pages = [
        ...SIZE_PRESETS_KB.map((kb) => `- Compress PDF to ${kb} KB: ${url(`/compress-pdf-to-${sizeSlug(kb)}`)}`),
        ...IMAGE_SIZE_PRESETS_KB.map((kb) => `- Resize image to ${kb} KB: ${url(`/resize-image-to-${sizeSlug(kb)}`)}`),
        `- Compress Image also takes an exact width and height in pixels together with the KB limit.${describe('/compress-image')}`,
        ...JPG_PDF_SIZE_PRESETS_KB.map((kb) => `- JPG to PDF under ${kb} KB: ${url(`/jpg-to-pdf-under-${sizeSlug(kb)}`)}`),
    ];
    const exams = [KERALA_PSC, SSC].map(
        (e) =>
            `- ${e.name} page (${url(e.path)}) does the whole job in one step: pick ${e.presets.map((p) => p.label).join(' or ')}, select the picture` +
            `${e.presets.some((p) => p.caption) ? ', type the name and photo date (printed on the photo automatically)' : ''}, click Resize, download the finished JPG. ` +
            `Official rules: ${e.presets.map((p) => `${p.label}: ${p.summary}`).join(' ')} Source: ${e.source.label}.`
    );
    return [
        'PDFAdore: free tools that run in the browser; files are not uploaded. No sign-up for these tools.',
        'Tools:',
        ...tools,
        'Size-limit pages:',
        ...pages,
        'Official exam rules (use only these; for any other exam say to check the official notification):',
        ...exams,
    ].join('\n');
}

/** Drafts a forum reply that solves the problem first and mentions the tool once, with a disclosure. */
export async function draftForumAnswer(question: { title: string; body: string; community?: string }): Promise<{ draft: string; problem: string | null }> {
    const completion = await getGroq().chat.completions.create({
        model: AI_MODEL,
        reasoning_effort: 'low',
        include_reasoning: false,
        max_completion_tokens: 700,
        temperature: 0.4,
        messages: [
            {
                role: 'system',
                content: [
                    'You help the owner of PDFAdore answer forum questions from their own account. They will read and edit your draft before posting.',
                    'Write a genuinely helpful reply that solves the problem on its own: exact sizes and practical tips first.',
                    'Then, at most once and at the end, mention the single most relevant PDFAdore page by its full URL, with a short disclosure such as "(I built this tool.)".',
                    'When you describe how to use a PDFAdore page, describe only what the facts say that page does. Never chain several PDFAdore tools for one job, and never suggest a workaround when a page does the job directly.',
                    'Rules: 60 to 180 words. Friendly and plain, like a person, not an ad. No hype words (best, amazing, #1). No hashtags or emoji.',
                    'Use only the facts given about the site and about exam rules. Never invent an exam rule, a feature, or a claim about what an exam body has or has not published.',
                    'For an exam not listed in the facts: say only that the exact sizes are in that exam’s official notification or application instructions, then give general tips (keep the original photo, crop to face and shoulders, plain light background) and how to meet whatever KB and pixel numbers they find there. Do not state or guess any size, centimetre, pixel or KB figure for that exam, not even as an example, and do not describe what that exam body publishes.',
                    'If the question is in Malayalam, Hindi or another language, reply in that language.',
                    'If PDFAdore cannot help with this question, still answer helpfully but do not mention PDFAdore.',
                    'Reply with the answer text only.',
                ].join('\n'),
            },
            { role: 'user', content: `Site facts:\n${siteFacts()}\n\nForum: ${question.community ?? 'unknown'}\nQuestion title: ${question.title}\nQuestion text: ${question.body.slice(0, 2000) || '(no text)'}` },
        ],
    });
    const draft = (completion.choices[0]?.message?.content ?? '').trim();
    return { draft, problem: draftProblem(draft) };
}
