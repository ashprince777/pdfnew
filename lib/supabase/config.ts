/**
 * Accounts and billing switch on only when their keys are configured, so the site keeps
 * working as a free tool site (no limits, no login) until setup is complete.
 * See docs/SETUP-SUBSCRIPTIONS.md.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const RAZORPAY_PUBLIC_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '';

/** Login/sign-up are available. */
export const isAuthEnabled = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Plans and limits are enforced (requires both accounts and payments). */
export const isBillingEnabled = () => isAuthEnabled() && Boolean(RAZORPAY_PUBLIC_KEY);

/** Absolute site URL for auth redirects and payment callbacks. */
export function siteUrl(): string {
    if (typeof window !== 'undefined') return window.location.origin;
    return process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
}
