import type { BillingInterval, PlanId } from '@/lib/plans';

/** A row of the `subscriptions` table. */
export interface SubscriptionRow {
    user_id: string;
    plan: PlanId;
    status: string;
    billing_interval: BillingInterval | null;
    razorpay_subscription_id: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    /** End of the free trial, when the subscription started with one. */
    trial_ends_at?: string | null;
    updated_at: string;
}

/** Statuses after which access ends immediately, regardless of the paid period. */
const BLOCKING_STATUSES = new Set(['halted', 'expired', 'created']);

/**
 * Premium while the paid period lasts. A cancelled subscription keeps Premium until the end
 * of the period already paid for; a halted one (failed renewals) loses it right away.
 */
export function isPremium(row: Pick<SubscriptionRow, 'plan' | 'status' | 'current_period_end'> | null | undefined, now = new Date()): boolean {
    if (!row || row.plan !== 'premium' || BLOCKING_STATUSES.has(row.status) || !row.current_period_end) return false;
    return new Date(row.current_period_end).getTime() > now.getTime();
}

export function effectivePlan(row: Parameters<typeof isPremium>[0], now = new Date()): PlanId {
    return isPremium(row, now) ? 'premium' : 'free';
}

/** True while the user is inside a free trial (renewing or already cancelled). */
export function isInTrial(row: Pick<SubscriptionRow, 'trial_ends_at' | 'status'> | null | undefined, now = new Date()): boolean {
    if (!row?.trial_ends_at || BLOCKING_STATUSES.has(row.status)) return false;
    return new Date(row.trial_ends_at).getTime() > now.getTime() && ['authenticated', 'cancelled'].includes(row.status);
}
