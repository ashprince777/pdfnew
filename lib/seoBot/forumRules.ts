/**
 * Pure rules for the Forum helper (no I/O), kept separate so they can be unit tested:
 * which searches to run and which threads are worth answering.
 */

/** Reddit searches for problems the site's tools solve. */
export const FORUM_QUERIES = [
    'kerala psc photo',
    'psc photo signature size',
    'ssc signature size',
    'reduce pdf size',
    'compress pdf to 200kb',
    'photo size 20kb',
    'resize photo for exam form',
    'jpg to pdf small size',
    'pdf password aadhaar',
    'remove password from pdf',
];

/** Words that show the poster has a file problem we can help with. */
const PROBLEM = /\b(pdf|jpg|jpeg|png|photo|photograph|signature|image|scan|kb|mb|size|resize|compress|reduce|upload|password)\b/i;
/** Threads that are not questions we should answer (jobs, selling, piracy...). */
const EXCLUDE = /\b(hiring|for hire|\[for sale\]|selling|giveaway|crack|keygen|torrent|nsfw)\b/i;

/** Answer only recent, open threads that are about a file problem and not already crowded. */
export const MAX_AGE_DAYS = 14;
export const MAX_COMMENTS = 25;

export interface ForumCandidate {
    title: string;
    body: string;
    ageDays: number;
    comments: number;
    locked: boolean;
}

export function isWorthAnswering(t: ForumCandidate): boolean {
    const text = `${t.title} ${t.body}`;
    return !t.locked && t.ageDays <= MAX_AGE_DAYS && t.comments <= MAX_COMMENTS && PROBLEM.test(text) && !EXCLUDE.test(text);
}

/** The draft must disclose that the poster built the tool, and link to the site at most once. */
export function draftProblem(draft: string): string | null {
    if (draft.trim().length < 80) return 'too short';
    if (draft.length > 1500) return 'too long';
    const links = draft.match(/pdfadore\.com/gi)?.length ?? 0;
    if (links === 0) return 'no link to the tool';
    if (links > 1) return 'links to the site more than once';
    if (!/\b(i built|i made|i created|my own|my tool|disclosure)\b/i.test(draft)) return 'missing the "I built this" disclosure';
    return null;
}
