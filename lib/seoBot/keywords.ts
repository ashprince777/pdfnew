import 'server-only';
import { PAGE_SEO, BLOG_SEO } from '../seo';
import { keywordCovered } from './rules';

/** Head terms for each tool family; Google autocomplete expands them into what people in India type. */
export const KEYWORD_SEEDS = [
    'compress pdf',
    'pdf to word',
    'jpg to pdf',
    'merge pdf',
    'pdf to jpg',
    'split pdf',
    'edit pdf',
    'pdf password',
    'pdf converter',
    'reduce pdf size',
    'pdf to excel',
    'sign pdf',
];

/** Keywords from the research behind the current pages, with monthly India search volume (Oct 2026). */
export const TARGET_KEYWORDS: { keyword: string; volume: number; path: string }[] = [
    { keyword: 'jpg to pdf', volume: 7_480_000, path: '/jpg-to-pdf' },
    { keyword: 'pdf to word', volume: 6_120_000, path: '/pdf-to-word' },
    { keyword: 'pdf to jpg', volume: 4_090_000, path: '/pdf-to-jpg' },
    { keyword: 'merge pdf', volume: 3_350_000, path: '/merge-pdf' },
    { keyword: 'word to pdf', volume: 3_350_000, path: '/word-to-pdf' },
    { keyword: 'image to pdf', volume: 2_740_000, path: '/jpg-to-pdf' },
    { keyword: 'pdf compressor', volume: 2_240_000, path: '/compress-pdf' },
    { keyword: 'reduce pdf size', volume: 1_220_000, path: '/compress-pdf' },
    { keyword: 'pdf to excel', volume: 1_220_000, path: '/pdf-to-excel' },
    { keyword: 'split pdf', volume: 673_000, path: '/split-pdf' },
    { keyword: 'delete pages from pdf', volume: 550_000, path: '/remove-pages' },
    { keyword: 'unlock pdf', volume: 450_000, path: '/unlock-pdf' },
    { keyword: 'pdf password remover', volume: 246_000, path: '/unlock-pdf' },
    { keyword: 'png to pdf', volume: 165_000, path: '/png-to-pdf' },
    { keyword: 'remove password from pdf', volume: 165_000, path: '/unlock-pdf' },
    { keyword: 'pdf to png', volume: 74_000, path: '/pdf-to-png' },
    { keyword: 'extract pages from pdf', volume: 74_000, path: '/split-pdf' },
    { keyword: 'ocr pdf', volume: 49_500, path: '/pdf-to-text' },
    { keyword: 'compress pdf to 300kb', volume: 40_500, path: '/compress-pdf-to-300kb' },
    { keyword: 'compress pdf to 2mb', volume: 27_100, path: '/compress-pdf-to-2mb' },
    { keyword: 'aadhaar pdf password', volume: 22_200, path: '/blog/aadhaar-pan-itr-pdf-password' },
    { keyword: 'rearrange pdf pages', volume: 22_200, path: '/organize-pdf' },
    { keyword: 'pdf to text', volume: 18_100, path: '/pdf-to-text' },
    { keyword: 'compress pdf to 150kb', volume: 12_100, path: '/compress-pdf-to-150kb' },
    { keyword: 'compress pdf to 400kb', volume: 12_100, path: '/compress-pdf-to-400kb' },
    { keyword: 'webp to pdf', volume: 3_600, path: '/webp-to-pdf' },
];

const PAGE_TITLES = [...Object.values(PAGE_SEO), ...Object.values(BLOG_SEO)].map((s) => s.title);

/** True when some page title already targets every meaningful word of the keyword. */
export const isCovered = (keyword: string) => keywordCovered(keyword, PAGE_TITLES);

/** Competitor brand searches: people looking for that site, not a keyword we can win. */
const COMPETITOR = /i ?love ?pdf|11zon|small ?pdf|adobe|acrobat|sejda|pdf24|soda ?pdf|pdf ?candy|foxit|wps|nitro|canva/i;

/** Google autocomplete suggestions for every seed (India, English). */
export async function fetchKeywordIdeas(): Promise<{ keyword: string; seed: string }[]> {
    const ideas = new Map<string, string>();
    for (const seed of KEYWORD_SEEDS) {
        try {
            const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=in&q=${encodeURIComponent(seed)}`, {
                cache: 'no-store',
                signal: AbortSignal.timeout(8000),
            });
            const [, suggestions] = (await res.json()) as [string, string[]];
            for (const raw of suggestions) {
                const s = raw.toLowerCase().trim();
                if (!ideas.has(s) && !COMPETITOR.test(s)) ideas.set(s, seed);
            }
        } catch {
            // One seed failing is fine; the rest still count.
        }
    }
    return [...ideas].map(([keyword, seed]) => ({ keyword, seed }));
}
