export default function PrivacyPage() {
    return (
        <div className="container" style={{ padding: '60px 20px', maxWidth: '800px' }}>
            <h1>Privacy Policy</h1>
            <p>Last updated: {new Date().toLocaleDateString()}</p>

            <h2 className="mt-4">1. Introduction</h2>
            <p>Welcome to PDF Tools. We respect your privacy and are committed to protecting your personal data.</p>

            <h2 className="mt-4">2. File Security</h2>
            <p>
                When you use our tools, your files are processed directly in your browser.
                Files are NOT uploaded to our servers for most tools.
                For tools that may require server-side processing in the future, files are automatically deleted after processing.
            </p>

            <h2 className="mt-4">3. Data Collection</h2>
            <p>
                We do not collect personal information unless you voluntarily provide it.
                We use cookies and similar technologies to analyze traffic and provide advertisements via Google AdSense.
            </p>

            <h2 className="mt-4">4. Third-Party Services</h2>
            <p>
                We use Google AdSense to serve ads. Google may use cookies to serve ads based on your prior visits to our website or other websites.
            </p>
        </div>
    );
}
