import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BillingInterval } from '@/lib/plans';

/** The parts of a Razorpay subscription entity we rely on. */
export interface RazorpaySubscriptionEntity {
    id: string;
    plan_id: string;
    status: string;
    current_end?: number | null;
    /** When the first charge happens; in the future while a free trial runs. */
    start_at?: number | null;
    ended_at?: number | null;
    notes?: Record<string, string | number> | unknown[];
}

export interface RazorpayPaymentEntity {
    id: string;
    amount: number;
    currency: string;
    status: string;
    invoice_id?: string | null;
}

const INTERVAL_DAYS: Record<BillingInterval, number> = { monthly: 31, yearly: 366 };
/** Billing cycles to authorise up front (Razorpay requires a fixed count): ~10 years. */
export const TOTAL_CYCLES: Record<BillingInterval, number> = { monthly: 120, yearly: 10 };

export function isRazorpayConfigured(): boolean {
    return Boolean(
        process.env.RAZORPAY_KEY_ID &&
            process.env.RAZORPAY_KEY_SECRET &&
            process.env.RAZORPAY_PLAN_MONTHLY &&
            process.env.RAZORPAY_PLAN_YEARLY &&
            process.env.SUPABASE_SERVICE_ROLE_KEY
    );
}

let instance: Razorpay | null = null;
export function getRazorpay(): Razorpay {
    if (!instance) instance = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
    return instance;
}

export function planIdFor(interval: BillingInterval): string {
    return (interval === 'monthly' ? process.env.RAZORPAY_PLAN_MONTHLY : process.env.RAZORPAY_PLAN_YEARLY)!;
}

export function intervalForPlan(planId: string): BillingInterval | null {
    if (planId === process.env.RAZORPAY_PLAN_MONTHLY) return 'monthly';
    if (planId === process.env.RAZORPAY_PLAN_YEARLY) return 'yearly';
    return null;
}

function safeEqualHex(expected: string, actual: string): boolean {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(actual ?? '', 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
}

/** Signature returned by Razorpay Checkout for a subscription payment. */
export function verifyCheckoutSignature(paymentId: string, subscriptionId: string, signature: string, secret: string): boolean {
    const expected = createHmac('sha256', secret).update(`${paymentId}|${subscriptionId}`).digest('hex');
    return safeEqualHex(expected, signature);
}

/** X-Razorpay-Signature of a webhook, computed over the raw request body. */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return safeEqualHex(expected, signature);
}

export function userIdFromNotes(sub: RazorpaySubscriptionEntity): string | null {
    const notes = sub.notes;
    if (!notes || Array.isArray(notes)) return null;
    const id = notes.user_id;
    return typeof id === 'string' && id ? id : null;
}

function isTrialSubscription(sub: RazorpaySubscriptionEntity): boolean {
    const notes = sub.notes;
    return Boolean(notes && !Array.isArray(notes) && String(notes.trial) === '1' && sub.start_at);
}

/** Unix time (seconds) at which a trial that starts now ends and the first charge is taken. */
export function trialStartAt(trialDays: number, now = new Date()): number {
    return Math.floor(now.getTime() / 1000) + trialDays * 86_400;
}

/** Converts a Razorpay subscription into our `subscriptions` row. */
export function toSubscriptionRow(sub: RazorpaySubscriptionEntity, userId: string, now = new Date()) {
    const interval = intervalForPlan(sub.plan_id);
    const trialEnd = isTrialSubscription(sub) ? new Date(sub.start_at! * 1000) : null;
    let periodEnd: Date | null = sub.current_end ? new Date(sub.current_end * 1000) : null;
    if (!periodEnd && (sub.status === 'authenticated' || sub.status === 'active')) {
        // In a trial, Premium runs until the first charge. Otherwise Razorpay may not have filled
        // in current_end right after checkout: grant the first period.
        if (trialEnd) periodEnd = trialEnd;
        else if (interval) periodEnd = new Date(now.getTime() + INTERVAL_DAYS[interval] * 86_400_000);
    }
    if (sub.status === 'cancelled' && sub.ended_at) {
        const endedAt = new Date(sub.ended_at * 1000);
        if (trialEnd && endedAt < trialEnd) {
            // Trial cancelled before the first charge: nothing was paid, but the trial still runs its course.
            periodEnd = trialEnd;
        } else if (!periodEnd || endedAt < periodEnd) {
            // Cancelled immediately (not at cycle end): access ends when it ended.
            periodEnd = endedAt;
        }
    }
    return {
        user_id: userId,
        plan: 'premium' as const,
        status: sub.status,
        billing_interval: interval,
        razorpay_subscription_id: sub.id,
        current_period_end: periodEnd?.toISOString() ?? null,
        cancel_at_period_end: sub.status === 'cancelled' || sub.status === 'completed',
        trial_ends_at: trialEnd?.toISOString() ?? null,
        updated_at: now.toISOString(),
    };
}

/**
 * Normalises an email so the same inbox can't claim several trials:
 * case, "+tags" and (for Gmail) dots are ignored.
 */
export function trialEmailHash(email: string): string {
    let [local, domain] = email.trim().toLowerCase().split('@');
    if (!local || !domain) return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
    local = local.split('+')[0];
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
        local = local.replace(/\./g, '');
        domain = 'gmail.com';
    }
    return createHash('sha256').update(`${local}@${domain}`).digest('hex');
}

/** A trial is offered once per person: not to past subscribers, nor to an email that already had one. */
export async function isTrialEligible(admin: SupabaseClient, userId: string, email: string | undefined): Promise<boolean> {
    if (!email) return false;
    const [{ data: previous, error: subError }, { data: claim, error: claimError }] = await Promise.all([
        admin.from('subscriptions').select('razorpay_subscription_id').eq('user_id', userId).maybeSingle(),
        admin.from('trial_claims').select('email_hash').eq('email_hash', trialEmailHash(email)).maybeSingle(),
    ]);
    // If the trial migration has not been run yet, fall back to charging straight away.
    if (subError || claimError) {
        if (claimError) console.warn('Free trial unavailable (run supabase/migrations/0002_free_trial.sql):', claimError.message);
        return false;
    }
    return !previous?.razorpay_subscription_id && !claim;
}

/** Records that this email has used its trial (idempotent). */
export async function claimTrial(admin: SupabaseClient, sub: RazorpaySubscriptionEntity, userId: string): Promise<void> {
    if (!isTrialSubscription(sub)) return;
    const notes = sub.notes as Record<string, string | number>;
    const email = String(notes.email ?? '');
    if (!email) return;
    const { error } = await admin
        .from('trial_claims')
        .upsert({ email_hash: trialEmailHash(email), user_id: userId, razorpay_subscription_id: sub.id }, { onConflict: 'email_hash', ignoreDuplicates: true });
    if (error) throw new Error(`Failed to record trial: ${error.message}`);
}

/** Stores the latest state of a subscription. Called after checkout and on every webhook. */
export async function syncSubscription(admin: SupabaseClient, sub: RazorpaySubscriptionEntity, userId: string) {
    const row = toSubscriptionRow(sub, userId);
    const { data: existing } = await admin.from('subscriptions').select('razorpay_subscription_id, current_period_end').eq('user_id', userId).maybeSingle();
    // Ignore events for an older subscription if the user has since started a newer one.
    if (existing?.razorpay_subscription_id && existing.razorpay_subscription_id !== sub.id && ['cancelled', 'completed', 'expired', 'halted'].includes(sub.status)) {
        return;
    }
    const { error } = await admin.from('subscriptions').upsert(row, { onConflict: 'user_id' });
    if (error) throw new Error(`Failed to store subscription: ${error.message}`);
}

export async function recordPayment(admin: SupabaseClient, payment: RazorpayPaymentEntity, userId: string, subscriptionId: string | null) {
    const { error } = await admin.from('payments').upsert(
        {
            user_id: userId,
            razorpay_payment_id: payment.id,
            razorpay_subscription_id: subscriptionId,
            razorpay_invoice_id: payment.invoice_id ?? null,
            amount_paise: payment.amount,
            currency: payment.currency,
            status: payment.status,
        },
        { onConflict: 'razorpay_payment_id' }
    );
    if (error) throw new Error(`Failed to record payment: ${error.message}`);
}
