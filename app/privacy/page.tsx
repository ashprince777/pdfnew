import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'How MyOnlinePDF handles your data: all PDF processing happens in your browser and your files are never uploaded.',
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
            <p>Welcome to MyOnlinePDF. We respect your privacy and are committed to protecting your personal data.</p>

            <h2 className="mt-4">2. Your Files</h2>
            <p>
                Every tool on this site processes your files directly in your browser. Your documents, images and
                passwords are never uploaded to our servers, so we cannot see, store or share them. Results are kept
                only in your browser&apos;s memory until you start over or close the page.
            </p>

            <h2 className="mt-4">3. Data Collection</h2>
            <p>
                We do not collect personal information unless you voluntarily provide it, for example by contacting us.
                With your consent, we use Google Analytics to understand aggregate traffic (pages visited, device type).
                Analytics is only loaded after you accept it in the cookie banner, and you can change your choice at any
                time by clearing this site&apos;s data in your browser.
            </p>

            <h2 className="mt-4">4. Local Storage</h2>
            <p>
                We store a few preferences in your browser&apos;s local storage: your light/dark theme, your recently
                used tools and your cookie choice. This data never leaves your device.
            </p>

            <h2 className="mt-4">5. Third-Party Services</h2>
            <p>
                If you accept analytics cookies, Google Analytics may set cookies to measure usage. We do not serve
                advertising and do not sell data to anyone.
            </p>
        </div>
    );
}
