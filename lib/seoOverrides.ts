import 'server-only';
import type { Metadata } from 'next';
import { isAuthEnabled, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase/config';
import { pageMetadata, type MetadataOptions } from './seo';

/** Cache tag for the live titles; the SEO bot revalidates it after changing one. */
export const SEO_OVERRIDES_TAG = 'seo-overrides';

export interface SeoOverride {
    path: string;
    title: string;
    description: string;
}

/**
 * Titles and descriptions the SEO bot has set (table seo_overrides), keyed by path.
 * Cached for a day and refreshed on demand, so pages stay static. Any failure falls back
 * to the defaults in lib/seo.ts.
 */
export async function getSeoOverrides(): Promise<Record<string, SeoOverride>> {
    if (!isAuthEnabled()) return {};
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/seo_overrides?select=path,title,description`, {
            headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
            cache: 'force-cache',
            next: { tags: [SEO_OVERRIDES_TAG], revalidate: 86_400 },
            signal: AbortSignal.timeout(4000),
        });
        if (!res.ok) return {};
        const rows = (await res.json()) as SeoOverride[];
        return Object.fromEntries(rows.map((row) => [row.path, row]));
    } catch {
        return {};
    }
}

/** pageMetadata() with the live title and description from the SEO bot, when it has set one. */
export async function seoMetadata(path: string, options: MetadataOptions = {}): Promise<Metadata> {
    const override = (await getSeoOverrides())[path];
    return pageMetadata(path, override ? { ...options, title: override.title, description: override.description } : options);
}
