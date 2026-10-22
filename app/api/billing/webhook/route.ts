import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
    claimTrial,
    recordPayment,
    syncSubscription,
    userIdFromNotes,
    verifyWebhookSignature,
    type RazorpayPaymentEntity,
    type RazorpaySubscriptionEntity,
} from '@/lib/billing/razorpay';

interface WebhookEvent {
    event: string;
    payload: {
        subscription?: { entity: RazorpaySubscriptionEntity };
        payment?: { entity: RazorpayPaymentEntity };
    };
}

/**
 * Razorpay webhook (configure in Dashboard → Webhooks with the subscription.* events).
 * Keeps Premium in sync with renewals, failed payments and cancellations.
 */
export async function POST(request: NextRequest) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });

    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') ?? '';
    if (!verifyWebhookSignature(rawBody, signature, secret)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    let event: WebhookEvent;
    try {
        event = JSON.parse(rawBody) as WebhookEvent;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const subscription = event.payload.subscription?.entity;
    if (!event.event.startsWith('subscription.') || !subscription) {
        return NextResponse.json({ ok: true, ignored: event.event });
    }

    const userId = userIdFromNotes(subscription);
    if (!userId) {
        // Not created by this site (e.g. made by hand in the dashboard). Acknowledge so Razorpay stops retrying.
        return NextResponse.json({ ok: true, ignored: 'no user_id in notes' });
    }

    try {
        const admin = getSupabaseAdmin();
        await syncSubscription(admin, subscription, userId);
        if (event.event === 'subscription.authenticated' || event.event === 'subscription.activated') await claimTrial(admin, subscription, userId);
        const payment = event.payload.payment?.entity;
        if (event.event === 'subscription.charged' && payment) await recordPayment(admin, payment, userId, subscription.id);
    } catch (error) {
        console.error('Webhook processing failed', event.event, error);
        // 5xx makes Razorpay retry the delivery later.
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
}
