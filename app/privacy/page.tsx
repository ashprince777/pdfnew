import type { Metadata } from 'next';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'How PDFAdore handles your data: all PDF processing happens in your browser and your files are never uploaded.',
    alternates: {
        canonical: '/privacy',
    },
};

const LAST_UPDATED = 'October 21, 2026';

export default function PrivacyPage() {
    return (
        <div className="container" style={{ padding: '60px 20px', maxWidth: '800px' }}>
            <h1>Privacy Policy</h1>
            <p className="text-muted">Last updated: {LAST_UPDATED}</p>

            <h2 className="mt-4">1. Introduction</h2>
            <p>Welcome to PDFAdore. We respect your privacy and are committed to protecting your personal data.</p>

            <h2 className="mt-4">2. Your Files</h2>
            <p>
                Every PDF tool on this site (all tools except the AI tools described below) processes your files directly in your browser. Your documents, images and
                passwords are never uploaded to our servers, so we cannot see, store or share them. Results are kept
                only in your browser&apos;s memory until you start over or close the page.
            </p>

            <h2 className="mt-4" id="ai">AI Tools (Summarize, Chat with PDF, Translate)</h2>
            <p>
                The AI tools are the only exception to the rule above, and they ask for your confirmation before first use.
                When you use them, your browser extracts the text of the pages you choose and sends that text (not the PDF
                file, its images or metadata) through our server to Groq, Inc., which runs the AI model that writes the
                answer. We do not store the document text, your questions or the answers; we only count how many AI
                requests you make each month to apply your plan&apos;s credits. Groq processes the text to produce the answer
                under its API terms and privacy policy (groq.com/privacy-policy). Do not use the AI tools for
                documents you are not permitted to share with a third-party service.
            </p>

            <h2 className="mt-4">3. Your Account</h2>
            <p>
                An account is optional. If you create one, we store your email address, your name (if you give it) and your
                plan with our authentication and database provider, Supabase. If you sign in with Google, Google shares
                your name and email with us. You can delete your account and this data at any time from the account page.
            </p>

            <h2 className="mt-4">4. Payments</h2>
            <p>
                Premium payments are handled by Razorpay. Your card, UPI or bank details are entered directly with
                Razorpay and never reach our servers. We keep a record of your subscription status and payment history
                (amount, date, payment ID) to manage your plan and for accounting and tax purposes.
            </p>

            <h2 className="mt-4">5. Analytics and Cookies</h2>
            <p>
                With your consent, we use Google Analytics to understand aggregate traffic (pages visited, device type).
                Analytics is only loaded after you accept it in the cookie banner. If you log in, a cookie keeps you
                signed in; it is required for your account to work.
            </p>

            <h2 className="mt-4">6. Local Storage</h2>
            <p>
                We store a few preferences in your browser&apos;s local storage: your light/dark theme, your recently
                used tools and your cookie choice. This data never leaves your device.
            </p>

            <h2 className="mt-4">7. Sharing</h2>
            <p>
                We do not sell your data. We share it only with the providers above (Supabase, Razorpay, Groq for
                the AI tools you choose to use and, with consent, Google Analytics) to run the service, or when required
                by law.
            </p>

            <h2 className="mt-4">8. Contact</h2>
            <p>
                {SITE.legalName}, {SITE.address}. Email: <a href={`mailto:${SITE.supportEmail}`} style={{ textDecoration: 'underline' }}>{SITE.supportEmail}</a>
            </p>
        </div>
    );
}
