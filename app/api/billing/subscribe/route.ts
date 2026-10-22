import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser, getSupabaseAdmin } from '@/lib/supabase/server';
import { getRazorpay, isRazorpayConfigured, isTrialEligible, planIdFor, TOTAL_CYCLES, trialStartAt } from '@/lib/billing/razorpay';
import { isPremium } from '@/lib/billing/entitlement';
import { TRIAL_DAYS, type BillingInterval } from '@/lib/plans';
import { rateLimitResponse } from '@/lib/rateLimit';

/**
 * Creates a Razorpay subscription for the signed-in user; the browser then opens Checkout with its id.
 * First-time subscribers get a free trial: the mandate is set up now and the first charge is taken
 * when the trial ends (Razorpay `start_at`).
 */
export async function POST(request: NextRequest) {
    if (!isRazorpayConfigured()) return NextResponse.json({ error: 'Payments are not set up yet.' }, { status: 503 });

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Please log in to upgrade.' }, { status: 401 });
    const limited = rateLimitResponse(request, 'billing', user.id);
    if (limited) return limited;

    const body = (await request.json().catch(() => ({}))) as { interval?: string };
    const interval: BillingInterval | null = body.interval === 'monthly' || body.interval === 'yearly' ? body.interval : null;
    if (!interval) return NextResponse.json({ error: 'Choose monthly or yearly billing.' }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data: current } = await admin.from('subscriptions').select('plan, status, current_period_end, cancel_at_period_end').eq('user_id', user.id).maybeSingle();
    if (isPremium(current) && !current?.cancel_at_period_end) {
        return NextResponse.json({ error: 'You already have an active Premium subscription.' }, { status: 409 });
    }

    const trial = await isTrialEligible(admin, user.id, user.email);
    const startAt = trial ? trialStartAt(TRIAL_DAYS) : undefined;

    try {
        const subscription = await getRazorpay().subscriptions.create({
            plan_id: planIdFor(interval),
            total_count: TOTAL_CYCLES[interval],
            customer_notify: 1,
            ...(startAt ? { start_at: startAt } : {}),
            notes: { user_id: user.id, email: user.email ?? '', ...(trial ? { trial: '1' } : {}) },
        });
        return NextResponse.json({
            subscriptionId: subscription.id,
            keyId: process.env.RAZORPAY_KEY_ID,
            email: user.email,
            trialEndsAt: startAt ? new Date(startAt * 1000).toISOString() : null,
        });
    } catch (error) {
        console.error('Razorpay subscription create failed', error);
        return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 502 });
    }
}
