import 'server-only';
import Groq from 'groq-sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { effectivePlan } from '@/lib/billing/entitlement';
import { isAuthEnabled, isBillingEnabled } from '@/lib/supabase/config';
import { AI_CREDITS, type PlanId } from '@/lib/plans';

/** Groq model; override with GROQ_MODEL (see console.groq.com/docs/models). */
export const AI_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

/**
 * Longest document text sent in one request. Groq's free tier allows about 8,000 tokens per minute
 * in total, so the default (~5,000 tokens) leaves room for the answer. Raise AI_MAX_TEXT_CHARS on a
 * paid Groq tier (the model itself accepts ~130,000 tokens).
 */
export const AI_MAX_TEXT_CHARS = Number(process.env.AI_MAX_TEXT_CHARS) || 20_000;

/** A translation is about as long as its input, so translations take less text per request. */
export const maxCharsFor = (task: string) => (task === 'translate' ? Math.floor(AI_MAX_TEXT_CHARS * 0.4) : AI_MAX_TEXT_CHARS);

/** AI needs the Groq key plus accounts (credits are per user). */
export function isAiEnabled(): boolean {
    return Boolean(process.env.GROQ_API_KEY && isAuthEnabled() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let client: Groq | null = null;
export function getGroq(): Groq {
    // Reads GROQ_API_KEY (and GROQ_BASE_URL, used by the tests) from the environment.
    if (!client) client = new Groq();
    return client;
}

export const currentMonth = (now = new Date()) => now.toISOString().slice(0, 7);

/** The user's plan as the server sees it. Without payments configured everyone gets Premium limits. */
export async function getUserPlan(admin: SupabaseClient, userId: string): Promise<PlanId> {
    if (!isBillingEnabled()) return 'premium';
    const { data } = await admin.from('subscriptions').select('plan, status, current_period_end').eq('user_id', userId).maybeSingle();
    return effectivePlan(data);
}

export async function getAiUsage(admin: SupabaseClient, userId: string): Promise<{ plan: PlanId; used: number; limit: number }> {
    const [plan, { data }] = await Promise.all([
        getUserPlan(admin, userId),
        admin.from('ai_usage').select('used').eq('user_id', userId).eq('month', currentMonth()).maybeSingle(),
    ]);
    return { plan, used: (data as { used?: number } | null)?.used ?? 0, limit: AI_CREDITS[plan] };
}

/** Uses one credit. Returns credits used so far this month, or null when the monthly limit is reached. */
export async function consumeAiCredit(admin: SupabaseClient, userId: string, limit: number): Promise<number | null> {
    const { data, error } = await admin.rpc('consume_ai_credit', { p_user: userId, p_month: currentMonth(), p_limit: limit });
    if (error) throw new Error(`AI credits unavailable (run supabase/migrations/0003_ai_credits.sql): ${error.message}`);
    return typeof data === 'number' ? data : null;
}

export async function refundAiCredit(admin: SupabaseClient, userId: string): Promise<void> {
    const { error } = await admin.rpc('refund_ai_credit', { p_user: userId, p_month: currentMonth() });
    if (error) console.error('Could not refund AI credit', error.message);
}
