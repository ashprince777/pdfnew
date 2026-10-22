import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site';
import { CURRENCY_SYMBOL, PREMIUM_PRICES_INR, TRIAL_DAYS } from '@/lib/plans';

export const metadata: Metadata = {
    title: 'Cancellation & Refund Policy',
    description: 'How cancellations and refunds work for PDFAdore Premium subscriptions.',
    alternates: { canonical: '/refund-policy' },
};

export default function RefundPolicyPage() {
    return (
        <div className="container" style={{ padding: '60px 20px', maxWidth: '800px', display: 'grid', gap: 16 }}>
            <h1>Cancellation &amp; Refund Policy</h1>
            <p className="text-muted">Last updated: {SITE.policiesUpdated}</p>

            <h2>1. Subscriptions</h2>
            <p>
                {SITE.name} Premium is a recurring digital subscription, billed monthly ({CURRENCY_SYMBOL}
                {PREMIUM_PRICES_INR.monthly}) or yearly ({CURRENCY_SYMBOL}
                {PREMIUM_PRICES_INR.yearly.toLocaleString('en-IN')}), including applicable taxes. Payments are processed by Razorpay. Your
                subscription renews automatically until you cancel.
            </p>
            <p>
                <strong>Free trial.</strong> First-time subscribers get Premium free for {TRIAL_DAYS} days. When you start the trial you set up
                a recurring payment (UPI AutoPay or card); your bank may show a small verification charge, which is refunded automatically. The
                first payment is taken only when the trial ends. If you cancel during the trial you are never charged and keep Premium until the
                trial ends. The trial is available once per person.
            </p>

            <h2>2. Cancelling</h2>
            <p>
                You can cancel at any time from your <Link href="/account" style={{ textDecoration: 'underline' }}>account page</Link>. Cancellation stops all future
                renewals. You keep Premium access until the end of the billing period you have already paid for, after which your account
                returns to the Free plan. No cancellation fee applies.
            </p>

            <h2>3. Refunds</h2>
            <p>
                If you are not satisfied, you can request a full refund within <strong>7 days</strong> of your first Premium payment by
                emailing <a href={`mailto:${SITE.supportEmail}`} style={{ textDecoration: 'underline' }}>{SITE.supportEmail}</a> from the email address on your account.
                Renewal payments can be refunded if requested within 7 days of the renewal and Premium features have not been used since.
                Approved refunds are returned to the original payment method within 5–7 business days, as processed by Razorpay and your bank.
            </p>
            <p>If a payment was taken by mistake (for example, a duplicate charge), we will refund it in full.</p>

            <h2>4. Delivery</h2>
            <p>
                Premium is a digital service delivered instantly online: your account is upgraded as soon as the payment succeeds. No physical
                goods are shipped.
            </p>

            <h2>5. Contact</h2>
            <p>
                {SITE.legalName}, {SITE.address}. Email: <a href={`mailto:${SITE.supportEmail}`} style={{ textDecoration: 'underline' }}>{SITE.supportEmail}</a>
            </p>
        </div>
    );
}
