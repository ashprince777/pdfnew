import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'How PDFAdore collects, uses and protects your data, including data received through Google Sign-In. PDF processing happens in your browser and your files are never uploaded.',
    alternates: {
        canonical: '/privacy',
    },
};

const LAST_UPDATED = 'October 22, 2026';
const link = { textDecoration: 'underline' } as const;

export default function PrivacyPage() {
    const email = <a href={`mailto:${SITE.supportEmail}`} style={link}>{SITE.supportEmail}</a>;
    return (
        <div className="container legal" style={{ padding: '60px 20px', maxWidth: '820px', display: 'grid', gap: 14 }}>
            <h1>Privacy Policy</h1>
            <p className="text-muted">Last updated: {LAST_UPDATED}</p>

            <p>
                This Privacy Policy explains how {SITE.name} (&quot;we&quot;, &quot;us&quot;), operated by {SITE.legalName}, collects, uses, shares
                and protects information when you use {SITE.url.replace('https://', '')} (the &quot;Service&quot;). It also explains your choices and
                rights. By using the Service you agree to this policy.
            </p>

            <h2 className="mt-4">1. Summary</h2>
            <ul style={{ paddingLeft: 22, display: 'grid', gap: 6 }}>
                <li>Our PDF tools run in your browser. Your files are never uploaded to our servers.</li>
                <li>An account is optional. If you create one, we keep only what is needed to run it: your email, name and plan.</li>
                <li>If you sign in with Google, we receive only your name, email address, profile picture and Google account ID, and use them only to sign you in.</li>
                <li>We do not sell your data, we do not use it for advertising, and we do not use it to train AI models.</li>
                <li>You can delete your account and its data at any time from your account page.</li>
            </ul>

            <h2 className="mt-4">2. Your files</h2>
            <p>
                Every PDF tool on the Service (all tools except the optional AI tools in section 6) processes your files directly in your
                browser on your own device. Your documents, images and passwords are never uploaded to our servers, so we cannot see,
                store or share them. Results are kept only in your browser&apos;s memory until you start over or close the page.
            </p>

            <h2 className="mt-4">3. Information we collect</h2>
            <p><strong>Account information.</strong> If you create an account with email and password, we collect your email address, an encrypted (hashed) password and, if you provide it, your name.</p>
            <p><strong>Information from Google Sign-In.</strong> If you choose &quot;Continue with Google&quot;, see section 4.</p>
            <p><strong>Subscription and payment records.</strong> If you subscribe to Premium, we store your plan, subscription status, renewal dates and a record of payments (amount, currency, date and the payment, invoice and subscription IDs issued by Razorpay). We never receive or store your card, UPI or bank details.</p>
            <p><strong>Usage counters.</strong> If you use the AI tools, we store how many AI requests you made each month to apply your plan&apos;s credits. We do not store the content of those requests.</p>
            <p><strong>Technical data.</strong> Our hosting provider processes standard request data (IP address, browser type, pages requested, time) to deliver the Service, prevent abuse and apply rate limits. With your consent only, Google Analytics collects aggregate usage data (section 8).</p>

            <h2 className="mt-4" id="google">4. Google user data (Google Sign-In)</h2>
            <p>
                When you sign in with Google, you are asked to allow {SITE.name} to access basic information from your Google Account. We
                request only the standard sign-in permissions (<code>openid</code>, <code>email</code> and <code>profile</code>). We do not request
                access to your Gmail, Google Drive, Contacts, Calendar or any other Google service.
            </p>
            <p><strong>What we receive:</strong> your name, email address, profile picture URL and a unique Google account identifier.</p>
            <p><strong>How we use it:</strong> only to create your {SITE.name} account, sign you in, show your name on your account page, send you
                essential messages about your account and subscription (for example receipts and renewal reminders), and link your Premium
                subscription to your account.</p>
            <p><strong>How we store it:</strong> this data is stored securely by our authentication and database provider, Supabase, on encrypted
                servers. Access is restricted to the systems that run your account.</p>
            <p><strong>Sharing:</strong> we do not sell, rent or share your Google user data with anyone, and we do not use it for advertising,
                marketing to third parties, credit decisions or training AI or machine-learning models. It is not transferred to anyone except
                Supabase, which stores it on our behalf, or where required by law.</p>
            <p><strong>Retention and deletion:</strong> we keep it for as long as your account exists. When you delete your account (Account page →
                Delete account), your Google user data is permanently deleted from our systems. You can also remove {SITE.name}&apos;s access at any
                time from your Google Account at{' '}
                <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={link}>myaccount.google.com/permissions</a>.</p>
            <p>
                {SITE.name}&apos;s use and transfer of information received from Google APIs adheres to the{' '}
                <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={link}>
                    Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
            </p>

            <h2 className="mt-4">5. How we use information</h2>
            <ul style={{ paddingLeft: 22, display: 'grid', gap: 6 }}>
                <li>To provide the Service, create and secure your account and sign you in.</li>
                <li>To manage your plan, free trial, payments, renewals, cancellations and refunds.</li>
                <li>To apply plan limits and AI credits, and to prevent fraud, abuse and misuse.</li>
                <li>To answer your support requests and send essential service messages.</li>
                <li>To meet legal, accounting and tax obligations.</li>
            </ul>
            <p>We do not use your information for advertising and we do not sell it.</p>

            <h2 className="mt-4" id="ai">6. AI tools (Summarize, Chat with PDF, Translate)</h2>
            <p>
                The optional AI tools are the only tools that send document content off your device, and they ask for your confirmation
                before first use. When you use them, your browser extracts the text of the pages you choose and sends only that text (not
                the PDF file, its images or metadata) through our server to Groq, Inc., which runs the AI model that writes the answer. We do
                not store the document text, your questions or the answers. Groq processes the text to produce the answer under its API
                terms and{' '}
                <a href="https://groq.com/privacy-policy" target="_blank" rel="noopener noreferrer" style={link}>privacy policy</a>. Do not use the
                AI tools for documents you are not permitted to share with a third-party service.
            </p>

            <h2 className="mt-4">7. Service providers we share data with</h2>
            <p>We share information only with these providers, only as needed to run the Service:</p>
            <ul style={{ paddingLeft: 22, display: 'grid', gap: 6 }}>
                <li><strong>Supabase</strong>: authentication and database (account, plan and payment records).</li>
                <li><strong>Razorpay</strong>: payment processing for Premium subscriptions.</li>
                <li><strong>Vercel</strong>: website hosting and cookieless page-view statistics.</li>
                <li><strong>Groq</strong>: AI processing, only for the AI tools you choose to use.</li>
                <li><strong>Google</strong>: Google Sign-In if you choose it, and Google Analytics only with your consent.</li>
            </ul>
            <p>We may also disclose information if required by law, to protect our rights or users&apos; safety, or as part of a business transfer, in which case this policy continues to apply.</p>

            <h2 className="mt-4">8. Cookies, analytics and local storage</h2>
            <p>
                If you log in, a strictly necessary cookie keeps you signed in. With your consent only, we load Google Analytics to understand
                aggregate traffic (pages visited, device type). You can change your choice at any time in the cookie banner. We also use Vercel
                Web Analytics, which counts page views without cookies and without identifying you (it stores no personal data on your device).
                We also store a few
                preferences in your browser&apos;s local storage (theme, recently used tools, cookie choice and your AI notice confirmation). This data
                stays on your device.
            </p>

            <h2 className="mt-4">9. Data retention</h2>
            <p>
                We keep account data for as long as your account exists. When you delete your account, your profile, Google user data, plan and
                usage records are deleted. Payment records may be kept for up to 8 years where Indian tax and accounting law requires it. A
                record that an email address has used the free trial is kept as a one-way hash (not the email itself) to prevent repeated trials.
            </p>

            <h2 className="mt-4">10. Security</h2>
            <p>
                We use HTTPS encryption for all traffic, hashed passwords, row-level access controls in our database, signature verification for
                payment events and rate limiting. No system is perfectly secure, but we work to protect your information and will notify you and
                the authorities of a breach where the law requires.
            </p>

            <h2 className="mt-4">11. Your rights and choices</h2>
            <p>
                Subject to applicable law, including India&apos;s Digital Personal Data Protection Act, 2023, you can access, correct or delete your
                personal data, withdraw consent and nominate another person to exercise your rights. You can delete your account yourself from
                the <Link href="/account" style={link}>account page</Link>, or email us at {email}. We respond within 30 days.
            </p>

            <h2 className="mt-4">12. Children</h2>
            <p>The Service is not directed to children under 18, and we do not knowingly collect personal data from them. If you believe a child has created an account, contact us and we will delete it.</p>

            <h2 className="mt-4">13. International processing</h2>
            <p>Our providers may process data on servers outside India. Where they do, they apply safeguards consistent with this policy and applicable law.</p>

            <h2 className="mt-4">14. Changes to this policy</h2>
            <p>We may update this policy. We will change the date above and, for significant changes, notify signed-in users by email or on the Service before the change takes effect.</p>

            <h2 className="mt-4">15. Contact and grievance officer</h2>
            <p>
                For privacy questions, requests or complaints, contact our Grievance Officer: {SITE.legalName}, {SITE.address}. Phone: {SITE.phone}. Email: {email}.
            </p>
        </div>
    );
}
