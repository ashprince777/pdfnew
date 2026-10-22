import { NextResponse, type NextRequest } from 'next/server';
import { rateLimitResponse } from '@/lib/rateLimit';
import { getCurrentUser, getSupabaseAdmin } from '@/lib/supabase/server';
import { getRazorpay, isRazorpayConfigured } from '@/lib/billing/razorpay';

/** Permanently deletes the signed-in user's account, stopping any subscription first. */
export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 });
    const limited = rateLimitResponse(request, 'accountDelete', user.id);
    if (limited) return limited;

    let admin;
    try {
        admin = getSupabaseAdmin();
    } catch {
        return NextResponse.json({ error: 'Account deletion is not set up yet.' }, { status: 503 });
    }

    const { data: row } = await admin.from('subscriptions').select('razorpay_subscription_id, status').eq('user_id', user.id).maybeSingle();
    if (row?.razorpay_subscription_id && !['cancelled', 'completed', 'expired'].includes(row.status) && isRazorpayConfigured()) {
        try {
            // Stop future charges immediately; the account (and its access) is going away.
            await getRazorpay().subscriptions.cancel(row.razorpay_subscription_id, false);
        } catch (error) {
            console.error('Could not cancel subscription before deleting account', error);
            return NextResponse.json({ error: 'Could not cancel your subscription. Please try again or contact support.' }, { status: 502 });
        }
    }

    // Subscription and payment rows are removed by ON DELETE CASCADE.
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return NextResponse.json({ error: 'Could not delete the account. Please contact support.' }, { status: 500 });
    return NextResponse.json({ ok: true });
}
