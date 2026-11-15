'use server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getCurrentUser, getSupabaseAdmin } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { SEO_OVERRIDES_TAG } from '@/lib/seoOverrides';
import { revertChange, runSeoBot } from '@/lib/seoBot/run';
import { draftForumAnswer } from '@/lib/seoBot/forum';

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

/** Marks a forum thread as answered (posted by the owner) or not worth answering. */
export async function setForumStatus(formData: FormData) {
    await requireAdmin();
    const status = formData.get('status');
    if (status !== 'posted' && status !== 'skipped') return;
    await getSupabaseAdmin().from('seo_forum_threads').update({ status }).eq('id', String(formData.get('id')));
    revalidatePath('/admin/seo');
}

/** Drafts an answer for a question the owner pasted (Quora, Reddit, Telegram, anywhere). */
export async function draftPastedQuestion(formData: FormData) {
    await requireAdmin();
    const question = String(formData.get('question') ?? '').trim().slice(0, 3000);
    const url = String(formData.get('url') ?? '').trim().slice(0, 500);
    if (question.length < 10) return;
    const [title, ...rest] = question.split('\n');
    let community: string | undefined;
    try {
        community = url ? new URL(url).hostname : undefined;
    } catch {
        // Not a valid link: draft without it.
    }
    const { draft } = await draftForumAnswer({ title: title.slice(0, 300), body: rest.join('\n'), community });
    await getSupabaseAdmin()
        .from('seo_forum_threads')
        .insert({ id: `manual:${Date.now()}`, source: 'manual', url: url || null, title: title.slice(0, 300), body: rest.join('\n'), draft, status: 'new' });
    revalidatePath('/admin/seo');
}
