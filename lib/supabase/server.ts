import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { isAuthEnabled, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

/** Supabase client acting as the signed-in user (reads the session cookie). */
export async function getSupabaseServer(): Promise<SupabaseClient | null> {
    if (!isAuthEnabled()) return null;
    const cookieStore = await cookies();
    return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
            getAll: () => cookieStore.getAll(),
            setAll: (toSet) => {
                try {
                    toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                } catch {
                    // Called from a Server Component: the proxy refreshes the session instead.
                }
            },
        },
    });
}

/** The verified signed-in user, or null. */
export async function getCurrentUser(): Promise<User | null> {
    const supabase = await getSupabaseServer();
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
}

let admin: SupabaseClient | null = null;

/**
 * Service-role client for trusted server code only (payment webhooks, account deletion).
 * Bypasses row-level security, so it must never be exposed to the browser.
 */
export function getSupabaseAdmin(): SupabaseClient {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    if (!admin) admin = createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
    return admin;
}
