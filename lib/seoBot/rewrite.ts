import 'server-only';
import { AI_MODEL, getGroq } from '../ai/server';
import { ALL_TOOLS } from '../tools';

import { expectedCtr, type Draft, type PageStats } from './rules';

export type { Draft, PageStats };

/** Facts the AI may rely on, so new wording never promises something the tool does not do. */
function factsFor(path: string): string {
    const tool = ALL_TOOLS.find((t) => t.href === path);
    const facts = [
        'PDFAdore is an online PDF tools site for India, used on phones and computers.',
        tool?.access === 'premium'
            ? 'This tool is part of PDFAdore Premium (paid, 7-day free trial). Do not call it free.'
            : tool?.access === 'account'
              ? 'This AI tool needs a free account with 3 AI credits a month; the document text is sent to an AI model. Do not say files never leave the device.'
              : 'Free to use without sign-up. Files are processed in the browser and never uploaded.',
    ];
    if (tool) facts.push(`Tool: ${tool.title}. ${tool.description}`);
    return facts.join('\n');
}

/** Asks the AI for a title and description that better match what people search for. */
export async function draftRewrite(input: {
    path: string;
    current: { title: string; description: string };
    stats: PageStats;
    queries: { query: string; impressions: number; clicks: number; position: number }[];
}): Promise<Draft> {
    const { path, current, stats, queries } = input;
    const completion = await getGroq().chat.completions.create({
        model: AI_MODEL,
        reasoning_effort: 'low',
        include_reasoning: false,
        max_completion_tokens: 600,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: [
                    'You write Google search titles and meta descriptions for PDFAdore (www.pdfadore.com).',
                    'Goal: more people click the result, by matching the words people actually search for.',
                    'Rules:',
                    '- Title 45-60 characters. Put the main search phrase first. Keep " | PDFAdore" at the end if the current title has it.',
                    '- Description 140-160 characters: what the page does, one concrete benefit, and a reason to click.',
                    '- Use only the facts given. Never add claims such as best, #1, guaranteed or unlimited.',
                    '- Plain text in Indian English: no quotes, emoji or ALL CAPS.',
                    'Reply with JSON only: {"title": "...", "description": "...", "reason": "one sentence on what changed and why"}',
                ].join('\n'),
            },
            {
                role: 'user',
                content: [
                    `Page: https://www.pdfadore.com${path}`,
                    `Current title: ${current.title}`,
                    `Current description: ${current.description}`,
                    `Last 28 days: ${stats.impressions} impressions, ${stats.clicks} clicks, CTR ${(stats.ctr * 100).toFixed(1)}%, average position ${stats.position.toFixed(1)} (a typical CTR here is ${(expectedCtr(stats.position) * 100).toFixed(0)}%).`,
                    'Top searches that showed this page:',
                    ...queries.slice(0, 10).map((q) => `- "${q.query}": ${q.impressions} impressions, ${q.clicks} clicks, position ${q.position.toFixed(1)}`),
                    'Facts:',
                    factsFor(path),
                ].join('\n'),
            },
        ],
    });
    const text = completion.choices[0]?.message?.content ?? '';
    const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const draft = JSON.parse(json) as Draft;
    return { title: String(draft.title ?? '').trim(), description: String(draft.description ?? '').trim(), reason: String(draft.reason ?? '').trim() };
}

/** Short note on what a Google ranking update means for this site. */
export async function noteForUpdate(title: string, url: string): Promise<string> {
    const completion = await getGroq().chat.completions.create({
        model: AI_MODEL,
        reasoning_effort: 'low',
        include_reasoning: false,
        max_completion_tokens: 300,
        temperature: 0.3,
        messages: [
            {
                role: 'system',
                content:
                    'You advise a small Indian website with free in-browser PDF tools, short tool pages with FAQs, and how-to blog guides. In at most 3 short sentences, say what this Google Search update is about and what the site owner should check. Only state what is publicly known about the update; if you are not sure what it targets, say to watch Search Console for ranking changes during the rollout.',
            },
            { role: 'user', content: `Google Search update: ${title}\n${url}` },
        ],
    });
    return (completion.choices[0]?.message?.content ?? '').trim();
}
