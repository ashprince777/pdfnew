import { runSeoBot } from '@/lib/seoBot/run';

// Crawling the site and calling Google and the AI takes a while.
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/** Daily SEO bot run, called by Vercel Cron (vercel.json) with Authorization: Bearer $CRON_SECRET. */
export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { runId, summary } = await runSeoBot('cron');
    return Response.json({ runId, steps: summary.steps });
}
