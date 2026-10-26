import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCurrentUser, getSupabaseAdmin } from '@/lib/supabase/server';
import { isPremium, isInTrial, type SubscriptionRow } from '@/lib/billing/entitlement';
import { CURRENCY_SYMBOL } from '@/lib/plans';
import { SITE } from '@/lib/site';
import Link from 'next/link';
import { isAdminEmail } from '@/lib/admin';
import Tile from './Tile';
import styles from './Admin.module.css';

export const metadata: Metadata = {
    title: 'Admin dashboard',
    robots: { index: false, follow: false },
};
// Always fresh numbers.
export const dynamic = 'force-dynamic';

interface AdminUser {
    id: string;
    email?: string;
    created_at: string;
    email_confirmed_at?: string | null;
    last_sign_in_at?: string | null;
    app_metadata?: { provider?: string };
}

const DAY = 86_400_000;
const inr = (paise: number) => `${CURRENCY_SYMBOL}${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

async function loadUsers(admin: ReturnType<typeof getSupabaseAdmin>): Promise<AdminUser[]> {
    const users: AdminUser[] = [];
    for (let page = 1; page <= 50; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        users.push(...(data.users as AdminUser[]));
        if (data.users.length < 1000) break;
    }
    return users;
}

export default async function AdminPage() {
    const user = await getCurrentUser();
    if (!isAdminEmail(user?.email)) notFound();

    const admin = getSupabaseAdmin();
    const now = new Date();
    const month = now.toISOString().slice(0, 7);
    const [users, subsRes, paysRes, aiRes, trialsRes] = await Promise.all([
        loadUsers(admin),
        admin.from('subscriptions').select('*'),
        admin.from('payments').select('razorpay_payment_id, amount_paise, currency, status, created_at, user_id').order('created_at', { ascending: false }),
        admin.from('ai_usage').select('user_id, used').eq('month', month),
        admin.from('trial_claims').select('claimed_at'),
    ]);
    const subs = (subsRes.data ?? []) as SubscriptionRow[];
    const payments = (paysRes.data ?? []) as { razorpay_payment_id: string; amount_paise: number; currency: string; status: string; created_at: string; user_id: string }[];
    const aiRows = (aiRes.data ?? []) as { user_id: string; used: number }[];
    const trialClaims = (trialsRes.data ?? []) as { claimed_at: string }[];
    const emailById = new Map(users.map((u) => [u.id, u.email ?? '']));

    // Users
    const newSince = (days: number) => users.filter((u) => now.getTime() - new Date(u.created_at).getTime() < days * DAY).length;
    const confirmed = users.filter((u) => u.email_confirmed_at).length;
    const google = users.filter((u) => u.app_metadata?.provider === 'google').length;
    const activeWeek = users.filter((u) => u.last_sign_in_at && now.getTime() - new Date(u.last_sign_in_at).getTime() < 7 * DAY).length;

    // Plans
    const premium = subs.filter((s) => isPremium(s, now));
    const trialing = premium.filter((s) => isInTrial(s, now));
    const paying = premium.filter((s) => !isInTrial(s, now));
    const cancelling = premium.filter((s) => s.cancel_at_period_end);
    const halted = subs.filter((s) => s.status === 'halted');
    const yearly = paying.filter((s) => s.billing_interval === 'yearly').length;

    // Money (captured payments only; ₹5 trial verification charges are refunded by Razorpay, so they are excluded)
    const captured = payments.filter((p) => p.status === 'captured' && p.amount_paise >= 10000);
    const revenue = captured.reduce((sum, p) => sum + p.amount_paise, 0);
    const revenue30 = captured.filter((p) => now.getTime() - new Date(p.created_at).getTime() < 30 * DAY).reduce((sum, p) => sum + p.amount_paise, 0);

    // AI
    const aiCredits = aiRows.reduce((sum, r) => sum + r.used, 0);

    // Sign-ups per day, last 30 days (IST)
    const days: { key: string; label: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * DAY);
        days.push({ key: dayKey(d), label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }), count: 0 });
    }
    const byKey = new Map(days.map((d) => [d.key, d]));
    for (const u of users) {
        const bucket = byKey.get(dayKey(new Date(u.created_at)));
        if (bucket) bucket.count++;
    }
    const maxDay = Math.max(1, ...days.map((d) => d.count));
    const recentUsers = [...users].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 12);

    return (
        <div className={`container ${styles.page}`}>
            <header className={styles.header}>
                <h1>Dashboard</h1>
                <p className={styles.muted}>
                    {`${SITE.name} · updated ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST`}
                </p>
                <nav className={styles.subnav} aria-label="Admin sections">
                    <span aria-current="page">Overview</span>
                    <Link href="/admin/seo">SEO bot</Link>
                </nav>
            </header>

            <h2 className={styles.section}>Users</h2>
            <div className={styles.tiles}>
                <Tile label="Total accounts" value={users.length} note={`${confirmed} confirmed · ${google} via Google`} />
                <Tile label="New in last 7 days" value={newSince(7)} note={`${newSince(30)} in last 30 days`} />
                <Tile label="Active in last 7 days" value={activeWeek} note="signed in at least once" />
            </div>

            <figure className={styles.chartCard}>
                <figcaption className={styles.chartTitle}>New accounts per day (last 30 days)</figcaption>
                <div className={styles.chart} role="img" aria-label={`New accounts per day for the last 30 days. Highest: ${maxDay}.`}>
                    <span className={styles.axisMax}>{maxDay}</span>
                    {days.map((d) => (
                        <div key={d.key} className={styles.barSlot} tabIndex={0} aria-label={`${d.label}: ${d.count} new`}>
                            <div className={styles.bar} style={{ height: d.count ? `${Math.max(4, (d.count / maxDay) * 100)}%` : 0 }} />
                            <span className={styles.tooltip}>{`${d.label}: ${d.count} new`}</span>
                        </div>
                    ))}
                </div>
                <div className={styles.axis}>
                    <span>{days[0].label}</span>
                    <span>{days[days.length - 1].label}</span>
                </div>
                <details className={styles.tableToggle}>
                    <summary>Show as table</summary>
                    <table className={styles.table}>
                        <thead><tr><th>Day</th><th>New accounts</th></tr></thead>
                        <tbody>{days.filter((d) => d.count > 0).map((d) => <tr key={d.key}><td>{d.label}</td><td>{d.count}</td></tr>)}</tbody>
                    </table>
                </details>
            </figure>

            <h2 className={styles.section}>Plans &amp; revenue</h2>
            <div className={styles.tiles}>
                <Tile label="Paying Premium" value={paying.length} note={`${yearly} yearly · ${paying.length - yearly} monthly`} />
                <Tile label="In free trial" value={trialing.length} note={`${trialClaims.length} trials started in total`} />
                <Tile label="Cancelling at period end" value={cancelling.length} note={halted.length ? `${halted.length} halted (failed renewals)` : 'no failed renewals'} />
                <Tile label="Revenue, last 30 days" value={inr(revenue30)} note={`${inr(revenue)} all time · ${captured.length} payments`} />
            </div>

            <h2 className={styles.section}>AI tools</h2>
            <div className={styles.tiles}>
                <Tile label={`AI credits used in ${now.toLocaleDateString('en-IN', { month: 'long' })}`} value={aiCredits} note={`by ${aiRows.length} users`} />
            </div>

            <div className={styles.twoCol}>
                <section className={styles.card}>
                    <h2 className={styles.cardTitle}>Latest sign-ups</h2>
                    <table className={styles.table}>
                        <thead><tr><th>Email</th><th>Joined</th><th>Via</th></tr></thead>
                        <tbody>
                            {recentUsers.map((u) => (
                                <tr key={u.id}>
                                    <td className={styles.email}>{u.email}</td>
                                    <td>{fmtDate(u.created_at)}</td>
                                    <td>{u.app_metadata?.provider === 'google' ? 'Google' : u.email_confirmed_at ? 'Email' : 'Email (unconfirmed)'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
                <section className={styles.card}>
                    <h2 className={styles.cardTitle}>Latest payments</h2>
                    {payments.length === 0 ? (
                        <p className={styles.muted}>No payments yet.</p>
                    ) : (
                        <table className={styles.table}>
                            <thead><tr><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                            <tbody>
                                {payments.slice(0, 12).map((p) => (
                                    <tr key={p.razorpay_payment_id}>
                                        <td className={styles.email}>{emailById.get(p.user_id) || 'deleted account'}</td>
                                        <td>{fmtDate(p.created_at)}</td>
                                        <td>{inr(p.amount_paise)}</td>
                                        <td>{p.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            </div>

            <section className={styles.card}>
                <h2 className={styles.cardTitle}>Elsewhere</h2>
                <ul className={styles.links}>
                    <li><a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer">Google Analytics</a>: visitors, and which tools are used most (Reports → Engagement → Events → tool_used)</li>
                    <li><a href="https://search.google.com/search-console?resource_id=sc-domain%3Apdfadore.com" target="_blank" rel="noopener noreferrer">Search Console</a>: Google searches, clicks and indexing</li>
                    <li><a href="https://dashboard.razorpay.com/app/subscriptions" target="_blank" rel="noopener noreferrer">Razorpay subscriptions</a> and <a href="https://dashboard.razorpay.com/app/settlements" target="_blank" rel="noopener noreferrer">settlements</a></li>
                    <li><a href="https://app.brevo.com/" target="_blank" rel="noopener noreferrer">Brevo</a>: sign-up and password emails delivered</li>
                </ul>
            </section>
        </div>
    );
}
