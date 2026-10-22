import { NextResponse, type NextRequest } from 'next/server';
import { rateLimitResponse } from '@/lib/rateLimit';
import { getCurrentUser, getSupabaseAdmin } from '@/lib/supabase/server';
import { getRazorpay, isRazorpayConfigured, syncSubscription, type RazorpaySubscriptionEntity } from '@/lib/billing/razorpay';

/**
 * Cancels at the end of the current billing period: the user keeps Premium for the time already paid.
 * A subscription still in its free trial has no cycle yet, so it is cancelled right away (nothing is
 * ever charged) and Premium lasts until the trial would have ended.
 */
export async function POST(request: NextRequest) {
    if (!isRazorpayConfigured()) return NextResponse.json({ error: 'Payments are not set up yet.' }, { status: 503 });

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 });
    const limited = rateLimitResponse(request, 'billing', user.id);
    if (limited) return limited;

    const admin = getSupabaseAdmin();
    const { data: row } = await admin.from('subscriptions').select('razorpay_subscription_id, status').eq('user_id', user.id).maybeSingle();
    if (!row?.razorpay_subscription_id || ['cancelled', 'completed', 'expired'].includes(row.status)) {
        return NextResponse.json({ error: 'There is no active subscription to cancel.' }, { status: 404 });
    }

    try {
        const atCycleEnd = row.status !== 'authenticated';
        const subscription = (await getRazorpay().subscriptions.cancel(row.razorpay_subscription_id, atCycleEnd)) as unknown as RazorpaySubscriptionEntity;
        await syncSubscription(admin, subscription, user.id);
        // Razorpay keeps the status "active" until the cycle ends; remember that renewal is off.
        await admin.from('subscriptions').update({ cancel_at_period_end: true, updated_at: new Date().toISOString() }).eq('user_id', user.id);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Razorpay cancel failed', error);
        return NextResponse.json({ error: 'Could not cancel the subscription. Please try again.' }, { status: 502 });
    }
}
