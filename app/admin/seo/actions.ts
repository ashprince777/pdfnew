'use server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getCurrentUser, getSupabaseAdmin } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { SEO_OVERRIDES_TAG } from '@/lib/seoOverrides';
import { revertChange, runSeoBot } from '@/lib/seoBot/run';

async function requireAdmin() {
    const user = await getCurrentUser();
    if (!isAdminEmail(user?.email)) throw new Error('Not allowed');
}

/** Runs the daily SEO bot now (takes up to a few minutes). */
export async function runSeoBotNow() {
    await requireAdmin();
    await runSeoBot('manual');
    revalidatePath('/admin/seo');
}

/** Puts back the wording a page had before an automatic change. */
export async function undoSeoChange(formData: FormData) {
    await requireAdmin();
    const id = Number(formData.get('id'));
    const { data } = await getSupabaseAdmin().from('seo_changes').select('id, path, old_title, old_description, status').eq('id', id).single();
    if (!data || data.status === 'reverted') return;
    await revertChange(data, 'Undone by admin.');
    revalidateTag(SEO_OVERRIDES_TAG, 'max');
    revalidatePath('/admin/seo');
}
