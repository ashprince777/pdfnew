/**
 * Sliding-window rate limiter for API routes.
 *
 * State is kept in memory per server instance, so on serverless hosting each instance counts
 * separately: it stops bursts and scripted abuse from one client, not a distributed attack.
 * Login/sign-up go directly to Supabase, which has its own limits (Dashboard → Auth → Rate Limits).
 * Paid AI usage is additionally capped by the per-user monthly credits stored in the database.
 */
const hits = new Map<string, number[]>();
let lastSweep = Date.now();

export interface RateLimitRule {
    /** Maximum requests allowed in the window. */
    limit: number;
    windowMs: number;
}

export const RATE_LIMITS = {
    billing: { limit: 10, windowMs: 60_000 },
    accountDelete: { limit: 3, windowMs: 60 * 60_000 },
    ai: { limit: 20, windowMs: 60_000 },
} satisfies Record<string, RateLimitRule>;

/** Records a request and reports whether it is within the limit. */
export function checkRateLimit(key: string, rule: RateLimitRule, now = Date.now()): { ok: boolean; retryAfterSec: number } {
    // Drop stale entries occasionally so memory stays bounded.
    if (now - lastSweep > 5 * 60_000) {
        for (const [k, times] of hits) if (!times.some((t) => now - t < 60 * 60_000)) hits.delete(k);
        lastSweep = now;
    }
    const recent = (hits.get(key) ?? []).filter((t) => now - t < rule.windowMs);
    if (recent.length >= rule.limit) {
        hits.set(key, recent);
        return { ok: false, retryAfterSec: Math.ceil((rule.windowMs - (now - recent[0])) / 1000) };
    }
    recent.push(now);
    hits.set(key, recent);
    return { ok: true, retryAfterSec: 0 };
}
