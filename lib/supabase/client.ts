"use client";
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isAuthEnabled, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

let client: SupabaseClient | null = null;

/** Browser Supabase client (session stored in cookies so the server can read it). Null when accounts are not configured. */
export function getSupabaseBrowser(): SupabaseClient | null {
    if (!isAuthEnabled()) return null;
    if (!client) client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return client;
}
