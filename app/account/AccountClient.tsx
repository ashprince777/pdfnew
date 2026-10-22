"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Crown, LogOut, KeyRound, Trash2, Receipt } from 'lucide-react';
import { usePlan } from '@/components/PlanProvider';
import { useToast } from '@/components/ToastProvider';
import { OptionsCard, Notice, toolStyles } from '@/components/ToolUI';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { cancelPremium, deleteAccount } from '@/lib/billing/checkout';
import { isInTrial } from '@/lib/billing/entitlement';
import { CURRENCY_SYMBOL, PREMIUM_PRICES_INR } from '@/lib/plans';

interface PaymentRow {
    razorpay_payment_id: string;
    amount_paise: number;
    currency: string;
    status: string;
    created_at: string;
}

const formatDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

export default function AccountClient() {
    const { authEnabled, billingEnabled, user, loading, isPremium, subscription, refresh, signOut } = usePlan();
    const { showToast } = useToast();
    const router = useRouter();
    const params = useSearchParams();
    const [payments, setPayments] = useState<PaymentRow[]>([]);
    const [busy, setBusy] = useState<'cancel' | 'delete' | null>(null);
    const [confirmDelete, setConfirmDelete] = useState('');

    useEffect(() => {
        if (params.get('password') === 'updated') showToast('Your password has been updated.', 'success');
    }, [params, showToast]);

    useEffect(() => {
        const supabase = getSupabaseBrowser();
        if (!supabase || !user) return;
        supabase
            .from('payments')
            .select('razorpay_payment_id, amount_paise, currency, status, created_at')
            .order('created_at', { ascending: false })
            .limit(24)
            .then(({ data }) => setPayments((data as PaymentRow[] | null) ?? []));
    }, [user, subscription?.updated_at]);

    if (!authEnabled) {
        return (
            <div className="container" style={{ padding: '48px 16px', maxWidth: 640 }}>
                <Notice>Accounts are not available yet. All tools are free to use without an account.</Notice>
            </div>
        );
    }
    if (loading) return <p style={{ textAlign: 'center', padding: 64, color: 'var(--text-light)' }}>Loading your account...</p>;
    if (!user) {
        return (
            <div className="container" style={{ padding: '48px 16px', textAlign: 'center' }}>
                <p style={{ marginBottom: 16 }}>Please log in to see your account.</p>
                <Link href="/login?next=/account" className="btn btn-primary">Log in</Link>
            </div>
        );
    }

    const name = (user.user_metadata?.full_name as string | undefined) || user.email;
    const usesPassword = user.app_metadata?.provider === 'email';

    const onCancel = async () => {
        const message = inTrial
            ? `Cancel your free trial? You keep Premium until ${formatDate(subscription?.trial_ends_at)} and will not be charged.`
            : 'Cancel Premium? You will keep Premium until the end of the current billing period and will not be charged again.';
        if (!window.confirm(message)) return;
        setBusy('cancel');
        try {
            await cancelPremium();
            await refresh();
            showToast(`Premium cancelled. You keep it until ${formatDate(inTrial ? subscription?.trial_ends_at : subscription?.current_period_end)}.`, 'success');
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Could not cancel.', 'error');
        } finally {
            setBusy(null);
        }
    };

    const onDelete = async () => {
        setBusy('delete');
        try {
            await deleteAccount();
            await signOut();
            showToast('Your account has been deleted.', 'success');
            router.push('/');
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Could not delete the account.', 'error');
            setBusy(null);
        }
    };

    const onSignOut = async () => {
        await signOut();
        router.push('/');
        router.refresh();
    };

    const sub = subscription;
    const renewing = isPremium && sub && !sub.cancel_at_period_end;
    const inTrial = isPremium && isInTrial(sub);
    const price = `${CURRENCY_SYMBOL}${PREMIUM_PRICES_INR[sub?.billing_interval ?? 'monthly'].toLocaleString('en-IN')}`;

    return (
        <div className="container" style={{ padding: '40px 16px 72px', maxWidth: 760, display: 'grid', gap: 20 }}>
            <div>
                <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>Your account</h1>
                <p className={toolStyles.hint} style={{ fontSize: 'var(--text-base)' }}>Signed in as {name}{name !== user.email && ` (${user.email})`}</p>
            </div>

            {params.get('upgraded') === '1' && isPremium && <Notice>Welcome to Premium! Bigger files, more files per task and all pro features are now unlocked.</Notice>}

            <OptionsCard title="Plan">
                {!billingEnabled ? (
                    <p>Premium is launching soon. Every feature is free for now.</p>
                ) : isPremium && sub ? (
                    <div style={{ display: 'grid', gap: 12 }}>
                        <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 'var(--text-lg)' }}>
                            <Crown size={20} style={{ color: 'var(--primary)' }} /> Premium ({sub.billing_interval === 'yearly' ? 'yearly' : 'monthly'})
                            {inTrial && <span data-testid="trial-badge" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--primary)', color: '#fff' }}>Free trial</span>}
                        </p>
                        <p className={toolStyles.hint} style={{ fontSize: 'var(--text-sm)' }}>
                            {inTrial && renewing
                                ? `Your free trial ends on ${formatDate(sub.trial_ends_at)}. Your first payment of ${price} is taken then, unless you cancel before.`
                                : inTrial
                                  ? `Trial cancelled. Premium stays active until ${formatDate(sub.trial_ends_at)}; you will not be charged.`
                                  : renewing
                                    ? `Renews on ${formatDate(sub.current_period_end)} for ${price}.`
                                    : `Cancelled. Premium stays active until ${formatDate(sub.current_period_end)}; you will not be charged again.`}
                            {sub.status === 'pending' && ' Your last renewal payment failed; Razorpay will retry it automatically.'}
                        </p>
                        {renewing && (
                            <div>
                                <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy !== null}>
                                    {busy === 'cancel' ? 'Cancelling...' : inTrial ? 'Cancel free trial' : 'Cancel subscription'}
                                </button>
                            </div>
                        )}
                        {!renewing && (
                            <div>
                                <Link href="/pricing" className="btn btn-primary">Resubscribe</Link>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                        <p style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>Free</p>
                        <p className={toolStyles.hint} style={{ fontSize: 'var(--text-sm)' }}>
                            {sub?.status === 'halted'
                                ? 'Your Premium subscription was paused after repeated failed payments.'
                                : 'Upgrade for up to 200 files per task, 500 MB files, OCR and more.'}
                        </p>
                        <div>
                            <Link href="/pricing" className="btn btn-primary" style={{ gap: 8 }}>
                                <Crown size={18} /> Upgrade to Premium
                            </Link>
                        </div>
                    </div>
                )}
            </OptionsCard>

            {billingEnabled && payments.length > 0 && (
                <OptionsCard title="Payment history">
                    <div style={{ display: 'grid', gap: 8 }}>
                        {payments.map((p) => (
                            <div key={p.razorpay_payment_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 'var(--text-sm)', flexWrap: 'wrap' }}>
                                <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                                    <Receipt size={16} style={{ color: 'var(--text-light)' }} /> {formatDate(p.created_at)}
                                </span>
                                <span>
                                    {p.currency === 'INR' ? CURRENCY_SYMBOL : `${p.currency} `}
                                    {(p.amount_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })} · {p.status}
                                </span>
                            </div>
                        ))}
                        <p className={toolStyles.hint}>Receipts are emailed by Razorpay for every payment.</p>
                    </div>
                </OptionsCard>
            )}

            <OptionsCard title="Security">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {usesPassword && (
                        <Link href="/reset-password" className="btn btn-outline" style={{ gap: 8 }}>
                            <KeyRound size={18} /> Change password
                        </Link>
                    )}
                    <button type="button" className="btn btn-outline" style={{ gap: 8 }} onClick={onSignOut}>
                        <LogOut size={18} /> Sign out
                    </button>
                </div>
            </OptionsCard>

            <OptionsCard title="Delete account">
                <div style={{ display: 'grid', gap: 10 }}>
                    <p className={toolStyles.hint} style={{ fontSize: 'var(--text-sm)' }}>
                        Permanently deletes your account and payment history from our records and stops any subscription immediately. This cannot be undone.
                    </p>
                    <label className={toolStyles.label} htmlFor="confirm-delete">Type DELETE to confirm</label>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <input id="confirm-delete" className={toolStyles.input} style={{ maxWidth: 220 }} value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} />
                        <button type="button" className="btn btn-primary" style={{ gap: 8, background: 'var(--error)' }} disabled={confirmDelete !== 'DELETE' || busy !== null} onClick={onDelete}>
                            <Trash2 size={18} /> {busy === 'delete' ? 'Deleting...' : 'Delete my account'}
                        </button>
                    </div>
                </div>
            </OptionsCard>
        </div>
    );
}
