"use client";
import { CURRENCY_SYMBOL, PREMIUM_PRICES_INR, TRIAL_DAYS, type BillingInterval } from '@/lib/plans';

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_subscription_id: string;
    razorpay_signature: string;
}

interface RazorpayInstance {
    open(): void;
    on(event: 'payment.failed', handler: (response: { error?: { description?: string } }) => void): void;
}

declare global {
    interface Window {
        Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
    }
}

let scriptPromise: Promise<void> | null = null;

/** Loads Razorpay Checkout on demand (only when the user clicks Upgrade). */
function loadCheckoutScript(): Promise<void> {
    if (window.Razorpay) return Promise.resolve();
    if (!scriptPromise) {
        scriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = CHECKOUT_SCRIPT;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => {
                scriptPromise = null;
                reject(new Error('Could not load the payment window. Check your connection and try again.'));
            };
            document.body.appendChild(script);
        });
    }
    return scriptPromise;
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
}

export interface CheckoutResult {
    /** End of the free trial when the subscription started with one. */
    trialEndsAt: string | null;
}

/** Asks the server whether the signed-in user can still start a free trial. */
export async function fetchTrialEligibility(): Promise<boolean> {
    try {
        const res = await fetch('/api/billing/trial', { cache: 'no-store' });
        return res.ok && Boolean(((await res.json()) as { eligible?: boolean }).eligible);
    } catch {
        return false;
    }
}

/**
 * Starts a Premium subscription: creates it on our server, opens Razorpay Checkout, then has the
 * server verify the payment signature. Resolves when Premium is active, or with `null` if the
 * user closed the payment window.
 */
export async function startPremiumCheckout(interval: BillingInterval): Promise<CheckoutResult | null> {
    const { subscriptionId, keyId, email, trialEndsAt } = await postJson<{ subscriptionId: string; keyId: string; email?: string; trialEndsAt: string | null }>(
        '/api/billing/subscribe',
        { interval }
    );
    const price = `${CURRENCY_SYMBOL}${PREMIUM_PRICES_INR[interval].toLocaleString('en-IN')}/${interval === 'yearly' ? 'year' : 'month'}`;
    await loadCheckoutScript();
    const Razorpay = window.Razorpay;
    if (!Razorpay) throw new Error('Could not load the payment window.');

    return new Promise<CheckoutResult | null>((resolve, reject) => {
        const checkout = new Razorpay({
            key: keyId,
            subscription_id: subscriptionId,
            name: 'PDFAdore',
            description: trialEndsAt ? `${TRIAL_DAYS}-day free trial, then ${price}` : `Premium, ${price}`,
            prefill: email ? { email } : undefined,
            theme: { color: '#6d28d9' },
            handler: (response: RazorpayResponse) => {
                postJson('/api/billing/verify', response).then(() => resolve({ trialEndsAt }), reject);
            },
            modal: { ondismiss: () => resolve(null) },
        });
        checkout.on('payment.failed', (response) => {
            reject(new Error(response.error?.description || 'The payment failed. No money was taken; please try again.'));
        });
        checkout.open();
    });
}

export function cancelPremium(): Promise<unknown> {
    return postJson('/api/billing/cancel');
}

export function deleteAccount(): Promise<unknown> {
    return postJson('/api/account/delete');
}
