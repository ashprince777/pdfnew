import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
    title: 'Terms of Service',
    description: 'Terms of service for using PDFAdore online PDF tools and the Premium subscription.',
    alternates: {
        canonical: '/terms',
    },
};

const link = { textDecoration: 'underline' } as const;

export default function TermsPage() {
    return (
        <div className="container" style={{ padding: '60px 20px', maxWidth: '800px', display: 'grid', gap: 16 }}>
            <h1>Terms of Service</h1>
            <p className="text-muted">Last updated: {SITE.policiesUpdated}</p>

            <h2>1. Acceptance of Terms</h2>
            <p>
                By using {SITE.name} (operated by {SITE.legalName}), you agree to these terms. If you do not agree, please do not use the
                service.
            </p>

            <h2>2. The Service</h2>
            <p>
                {SITE.name} provides PDF tools that run in your web browser. Your documents are processed on your own device and are not
                uploaded to our servers. You are responsible for the documents you process and for having the right to use and modify them,
                including removing passwords with the Unlock PDF tool.
            </p>

            <h2>3. Accounts</h2>
            <p>
                An account is optional for the Free plan and required for Premium. Keep your login details confidential; you are responsible
                for activity on your account. You can delete your account at any time from the account page.
            </p>

            <h2>4. Premium Subscriptions</h2>
            <p>
                Premium is billed in advance, monthly or yearly, through Razorpay and renews automatically until cancelled. Prices are shown on
                the <Link href="/pricing" style={link}>pricing page</Link> and include applicable taxes. We may change prices for future
                billing periods with at least 30 days&apos; notice by email. A free trial, when offered, is limited to one per person; the
                first payment is taken automatically when the trial ends unless you cancel before then. Cancellations and refunds are covered by our{' '}
                <Link href="/refund-policy" style={link}>Cancellation &amp; Refund Policy</Link>.
            </p>

            <h2>5. Acceptable Use</h2>
            <p>
                Do not use the service for unlawful purposes, to infringe others&apos; rights, or to attempt to disrupt or reverse engineer
                the service or bypass plan limits.
            </p>

            <h2>6. Disclaimer and Liability</h2>
            <p>
                The service is provided “as is” without warranties of any kind. Always keep a copy of your original files. To the extent
                permitted by law, our total liability for any claim is limited to the amount you paid us in the 12 months before the claim.
            </p>

            <h2>7. Governing Law</h2>
            <p>These terms are governed by the laws of India, and the courts of {SITE.jurisdiction} have jurisdiction over any dispute.</p>

            <h2>8. Contact</h2>
            <p>
                {SITE.legalName}, {SITE.address}. Email: <a href={`mailto:${SITE.supportEmail}`} style={link}>{SITE.supportEmail}</a>
            </p>
        </div>
    );
}
