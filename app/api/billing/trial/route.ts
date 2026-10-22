import { NextResponse } from 'next/server';
import { getCurrentUser, getSupabaseAdmin } from '@/lib/supabase/server';
import { isRazorpayConfigured, isTrialEligible } from '@/lib/billing/razorpay';

/** Whether the signed-in user can still start a free trial (signed-out visitors are told yes). */
export async function GET() {
    if (!isRazorpayConfigured()) return NextResponse.json({ eligible: false });
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ eligible: true });
    return NextResponse.json({ eligible: await isTrialEligible(getSupabaseAdmin(), user.id, user.email) });
}
