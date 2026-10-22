import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser, getSupabaseAdmin } from '@/lib/supabase/server';
import { rateLimitResponse } from '@/lib/rateLimit';
import { claimTrial, getRazorpay, isRazorpayConfigured, syncSubscription, userIdFromNotes, verifyCheckoutSignature, type RazorpaySubscriptionEntity } from '@/lib/billing/razorpay';

/**
 * Called by the browser after Razorpay Checkout succeeds. Verifies the signature and activates
 * Premium immediately (the webhook confirms the same state moments later).
 */
export async function POST(request: NextRequest) {
    if (!isRazorpayConfigured()) return NextResponse.json({ error: 'Payments are not set up yet.' }, { status: 503 });

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 });
    const limited = rateLimitResponse(request, 'billing', user.id);
    if (limited) return limited;

    const body = (await request.json().catch(() => ({}))) as Record<string, string | undefined>;
    const paymentId = body.razorpay_payment_id;
    const subscriptionId = body.razorpay_subscription_id;
    const signature = body.razorpay_signature;
    if (!paymentId || !subscriptionId || !signature) return NextResponse.json({ error: 'Missing payment details.' }, { status: 400 });

    if (!verifyCheckoutSignature(paymentId, subscriptionId, signature, process.env.RAZORPAY_KEY_SECRET!)) {
        return NextResponse.json({ error: 'Payment verification failed.' }, { status: 400 });
    }

    const subscription = (await getRazorpay().subscriptions.fetch(subscriptionId)) as unknown as RazorpaySubscriptionEntity;
    // The subscription must belong to the user who is confirming it.
    if (userIdFromNotes(subscription) !== user.id) return NextResponse.json({ error: 'This payment belongs to a different account.' }, { status: 403 });

    const admin = getSupabaseAdmin();
    await syncSubscription(admin, subscription, user.id);
    await claimTrial(admin, subscription, user.id);
    return NextResponse.json({ ok: true });
}
