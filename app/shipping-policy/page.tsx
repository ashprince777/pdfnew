import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site';
import { CURRENCY_SYMBOL, PREMIUM_PRICES_INR } from '@/lib/plans';
import { breadcrumbSchema, pageMetadata } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = pageMetadata('/shipping-policy');

export default function ShippingPolicyPage() {
    const link = { textDecoration: 'underline' } as const;
    return (
        <>
            <JsonLd data={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Shipping & Delivery Policy', path: '/shipping-policy' }])} />
        <div className="container" style={{ padding: '60px 20px', maxWidth: '800px', display: 'grid', gap: 16 }}>
            <h1>Shipping &amp; Delivery Policy</h1>
            <p className="text-muted">Last updated: {SITE.policiesUpdated}</p>

            <h2>1. Digital service, nothing is shipped</h2>
            <p>
                {SITE.name} is an online software service operated by {SITE.legalName}. We do not sell or ship any physical goods, so no
                shipping charges apply and there is no physical delivery address to provide.
            </p>

            <h2>2. How the service is delivered</h2>
            <p>
                All PDF tools are delivered instantly through our website, {SITE.url.replace('https://', '')}, and work in your web browser on
                any device. Files you process are ready to download as soon as each task finishes.
            </p>

            <h2>3. Delivery of Premium subscriptions</h2>
            <p>
                Premium ({CURRENCY_SYMBOL}
                {PREMIUM_PRICES_INR.monthly} a month or {CURRENCY_SYMBOL}
                {PREMIUM_PRICES_INR.yearly.toLocaleString('en-IN')} a year) is activated on your account immediately after your payment or
                free-trial sign-up is confirmed by Razorpay, usually within a few seconds. You can see your plan on your{' '}
                <Link href="/account" style={link}>account page</Link>, and Razorpay emails a receipt for every payment.
            </p>

            <h2>4. If Premium is not activated</h2>
            <p>
                If your payment succeeded but Premium is not active within 30 minutes, log out and back in, then contact us at{' '}
                <a href={`mailto:${SITE.supportEmail}`} style={link}>{SITE.supportEmail}</a> or {SITE.phone} with your payment ID. We will
                activate it or refund the payment in full. See our <Link href="/refund-policy" style={link}>Cancellation &amp; Refund Policy</Link>.
            </p>

            <h2>5. Contact</h2>
            <p>
                {SITE.legalName}, {SITE.address}. Phone: {SITE.phone}. Email:{' '}
                <a href={`mailto:${SITE.supportEmail}`} style={link}>{SITE.supportEmail}</a>
            </p>
        </div>
        </>
    );
}
