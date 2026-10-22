import { NextResponse } from 'next/server';
import { getAiUsage, isAiEnabled, maxCharsFor } from '@/lib/ai/server';
import { getCurrentUser, getSupabaseAdmin } from '@/lib/supabase/server';

/** AI availability, this month's credits and the text limit (for ?task=) for the signed-in user. */
export async function GET(request: Request) {
    if (!isAiEnabled()) return NextResponse.json({ enabled: false });
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ enabled: true, signedIn: false });
    const task = new URL(request.url).searchParams.get('task') ?? '';
    const { plan, used, limit } = await getAiUsage(getSupabaseAdmin(), user.id);
    return NextResponse.json({ enabled: true, signedIn: true, plan, used, limit, maxChars: maxCharsFor(task) }, { headers: { 'Cache-Control': 'no-store' } });
}
