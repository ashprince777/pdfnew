"use client";
import { trackEvent } from '@/lib/analytics';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Crown } from 'lucide-react';
import { usePlan } from '@/components/PlanProvider';
import { useToast } from '@/components/ToastProvider';
import { Notice } from '@/components/ToolUI';
import { fetchTrialEligibility, startPremiumCheckout } from '@/lib/billing/checkout';
import { AI_CREDITS, COMPARISON, CURRENCY_SYMBOL, PREMIUM_PRICES_INR, TRIAL_DAYS, yearlyPerMonth, yearlySavingPercent, type BillingInterval } from '@/lib/plans';
import styles from './Pricing.module.css';

const FREE_FEATURES = ['All core PDF tools', 'Files never leave your device', `${AI_CREDITS.free} AI credits a month (summarize, chat, translate)`, 'Up to 10 files per merge', 'Files up to 50 MB (15 MB for Office)'];
const PREMIUM_FEATURES = [
    'Everything in Free',
    `${AI_CREDITS.premium} AI credits a month`,
    'Up to 200 files per task',
    'Files up to 500 MB (200 MB for Office)',
    'OCR: edit text in scanned PDFs',
    'PDF/A, image replacement & image watermarks',
    'Priority email support',
];

const FAQ = [
    {
        q: 'How does the free trial work?',
        a: `New subscribers get Premium free for ${TRIAL_DAYS} days. You set up UPI AutoPay or a card when you start (your bank may show a small verification charge that is refunded). The first payment is taken only when the trial ends. Cancel before then from your account page and you will not be charged at all. One trial per person.`,
    },
    {
        q: 'Do my files get uploaded when I subscribe?',
        a: 'No. Every PDF tool still runs entirely in your browser. Your account only tells the site which plan you are on; documents never leave your device. The only exception is the optional AI tools (Summarize, Chat with PDF, Translate): they send the text of the pages you choose to the AI model, after asking you first.',
    },
    {
        q: 'Which payment methods can I use?',
        a: 'Payments are handled securely by Razorpay. You can pay with UPI (AutoPay), debit or credit cards, and other methods Razorpay supports for recurring payments in your region.',
    },
    {
        q: 'Can I cancel anytime?',
        a: 'Yes. Cancel from your account page in one click. You keep Premium until the end of the period you have already paid for, and you will not be charged again.',
    },
    {
        q: 'Will I get an invoice?',
        a: 'Yes. Razorpay emails a receipt for every payment, and your payment history is listed on your account page.',
    },
    {
        q: 'Can I switch between monthly and yearly?',
        a: 'Yes. Cancel your current plan and subscribe to the other one when it ends, or contact support and we will help you switch.',
    },
];

/** `interval` and `checkout` come from the URL, read on the server so the page (and its prices) render without JavaScript. */
export default function PricingClient({ initialInterval, autoCheckout }: { initialInterval: BillingInterval; autoCheckout: boolean }) {
    const { billingEnabled, user, isPremium, loading, subscription, refresh } = usePlan();
    const { showToast } = useToast();
    const router = useRouter();
    const [interval, setBillingInterval] = useState<BillingInterval>(initialInterval);
    const [busy, setBusy] = useState(false);
    const [trialEligible, setTrialEligible] = useState(true);
    const autoStarted = useRef(false);

    const premiumActive = billingEnabled && isPremium;
    const upgrade = async (chosen: BillingInterval) => {
        if (!user) {
            router.push(`/signup?next=${encodeURIComponent(`/pricing?interval=${chosen}&checkout=1`)}`);
            return;
        }
        setBusy(true);
        try {
            const done = await startPremiumCheckout(chosen);
            if (done) {
                trackEvent(done.trialEndsAt ? 'trial_started' : 'subscribed', { plan: chosen });
                await refresh();
                showToast(
                    done.trialEndsAt
                        ? `Your ${TRIAL_DAYS}-day free trial has started. Premium is active now.`
                        : 'Welcome to Premium! Your new limits are active.',
                    'success'
                );
                router.push('/account?upgraded=1');
            }
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Could not start checkout.', 'error');
        } finally {
            setBusy(false);
        }
    };

    // Signed-out visitors are shown the trial; signed-in users only if they have not had one.
    useEffect(() => {
        if (!billingEnabled || loading || !user) return;
        let active = true;
        fetchTrialEligibility().then((eligible) => active && setTrialEligible(eligible));
        return () => {
            active = false;
        };
    }, [billingEnabled, loading, user]);

    const trialDate = new Date(Date.now() + TRIAL_DAYS * 86_400_000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const showTrial = billingEnabled && trialEligible && !premiumActive;

    // Coming back from sign-up with ?checkout=1: continue straight to payment.
    useEffect(() => {
        if (autoStarted.current || loading || !user || premiumActive || !autoCheckout) return;
        autoStarted.current = true;
        void upgrade(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when the session is ready
    }, [loading, user, premiumActive]);

    const price = interval === 'yearly' ? yearlyPerMonth() : PREMIUM_PRICES_INR.monthly;

    return (
        <div className={`container ${styles.page}`}>
            <div className={styles.header}>
                <h1 className={styles.title}>Simple pricing. Private by design.</h1>
                <p className={styles.subtitle}>Every PDF tool runs in your browser on every plan. Premium unlocks bigger files, more files per task and pro features.</p>
                <p className={styles.priceSummary} data-testid="price-summary">
                    <strong>Free</strong> forever · <strong>Premium</strong>{' '}
                    {`${CURRENCY_SYMBOL}${PREMIUM_PRICES_INR.monthly} a month or ${CURRENCY_SYMBOL}${PREMIUM_PRICES_INR.yearly.toLocaleString('en-IN')} a year (taxes included) · ${TRIAL_DAYS}-day free trial for new subscribers`}
                </p>
            </div>

            {!billingEnabled && (
                <div className={styles.notice}>
                    <Notice>Premium is launching soon. Until then, every tool and feature is free to use.</Notice>
                </div>
            )}

            <div className={styles.toggle} role="radiogroup" aria-label="Billing period">
                {(['monthly', 'yearly'] as const).map((value) => (
                    <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={interval === value}
                        className={interval === value ? styles.toggleActive : ''}
                        onClick={() => setBillingInterval(value)}
                    >
                        {value === 'monthly' ? 'Monthly' : 'Yearly'}
                        {value === 'yearly' && <span className={styles.saveBadge}>Save {yearlySavingPercent()}%</span>}
                    </button>
                ))}
            </div>

            <div className={styles.cards}>
                <section className={styles.card} aria-labelledby="plan-free">
                    <div>
                        <h2 id="plan-free" className={styles.planName}>Free</h2>
                        <p className={styles.planTagline}>For everyday PDF tasks</p>
                    </div>
                    <div className={styles.price}>
                        <span className={styles.amount}>{`${CURRENCY_SYMBOL}0`}</span>
                        <span className={styles.per}>forever</span>
                    </div>
                    <p className={styles.billedNote}>No credit card needed</p>
                    <ul className={styles.features}>
                        {FREE_FEATURES.map((f) => (
                            <li key={f}><Check size={16} /> {f}</li>
                        ))}
                    </ul>
                    <Link href={user ? '/all-tools' : '/signup'} className={`btn btn-outline ${styles.cta}`}>
                        {user ? 'Use free tools' : 'Start for free'}
                    </Link>
                </section>

                <section className={`${styles.card} ${styles.cardPremium}`} aria-labelledby="plan-premium">
                    <span className={styles.ribbon}><Crown size={13} /> Most popular</span>
                    <div>
                        <h2 id="plan-premium" className={styles.planName}>Premium</h2>
                        <p className={styles.planTagline}>For professionals and heavy users</p>
                    </div>
                    <div className={styles.price}>
                        <span className={styles.amount}>{`${CURRENCY_SYMBOL}${price}`}</span>
                        <span className={styles.per}>/ month</span>
                    </div>
                    <p className={styles.billedNote}>
                        {interval === 'yearly'
                            ? `${CURRENCY_SYMBOL}${PREMIUM_PRICES_INR.yearly.toLocaleString('en-IN')} billed yearly`
                            : 'Billed monthly, cancel anytime'}
                    </p>
                    {showTrial && (
                        <p className={styles.trialNote} data-testid="trial-note">
                            <strong>{TRIAL_DAYS} days free.</strong> {CURRENCY_SYMBOL}0 today, first payment on <span suppressHydrationWarning>{trialDate}</span>. Cancel before then and pay nothing.
                        </p>
                    )}
                    <ul className={styles.features}>
                        {PREMIUM_FEATURES.map((f) => (
                            <li key={f}><Check size={16} /> {f}</li>
                        ))}
                    </ul>
                    {premiumActive ? (
                        <Link href="/account" className={`btn btn-primary ${styles.cta}`}>
                            {subscription?.cancel_at_period_end ? 'Premium (ends soon), manage' : "You're on Premium, manage"}
                        </Link>
                    ) : (
                        <button type="button" className={`btn btn-primary ${styles.cta}`} disabled={!billingEnabled || busy || loading} onClick={() => upgrade(interval)}>
                            <Crown size={18} /> {!billingEnabled ? 'Coming soon' : busy ? 'Opening checkout...' : showTrial ? `Start ${TRIAL_DAYS}-day free trial` : 'Get Premium'}
                        </button>
                    )}
                </section>
            </div>

            <h2 className={styles.sectionTitle}>Compare plans</h2>
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th scope="col">Feature</th>
                            <th scope="col">Free</th>
                            <th scope="col" className={styles.premiumCol}>Premium</th>
                        </tr>
                    </thead>
                    <tbody>
                        {COMPARISON.map((row) => (
                            <tr key={row.label}>
                                <td>{row.label}</td>
                                <td>{row.free}</td>
                                <td className={styles.premiumCol}>{row.premium}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <h2 className={styles.sectionTitle}>Questions</h2>
            <div className={styles.faq}>
                {FAQ.map((item) => (
                    <details key={item.q}>
                        <summary>{item.q}</summary>
                        <p>{item.a}</p>
                    </details>
                ))}
            </div>
        </div>
    );
}
