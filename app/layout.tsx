import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CookieConsent from '@/components/CookieConsent';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { Analytics } from '@vercel/analytics/next';
import { ToastProvider } from '@/components/ToastProvider';
import { PlanProvider } from '@/components/PlanProvider';
import { SITE } from '@/lib/site';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
// Poppins is the typeface of the pdfadore wordmark; used for headings.
const poppins = Poppins({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-poppins' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  applicationName: SITE.name,
  title: {
    default: 'PDFAdore - Free Online PDF Tools (Merge, Split, Compress, Convert)',
    template: '%s | PDFAdore',
  },
  description: 'Free, fast, and secure online PDF tools. Merge, split, compress, protect, and convert PDFs directly in your browser. No registration required.',
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
  alternates: {
    canonical: './',
  },
  // Fallbacks only: every public page sets its own Open Graph and Twitter tags via pageMetadata() in lib/seo.ts.
  openGraph: {
    siteName: SITE.name,
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
  },
  // Search Console / Bing Webmaster verification: set these in Vercel to add the meta tags.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } : undefined,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

// Applies the saved (or system) theme before first paint to avoid a light-mode flash.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('pdf_theme')||localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${inter.className} ${inter.variable} ${poppins.variable}`}>
        <ToastProvider>
          <PlanProvider>
            <Navbar />
            <main style={{ minHeight: 'calc(100vh - 200px)' }}>
              {children}
            </main>
            <Footer />
            <CookieConsent />
            <GoogleAnalytics />
            {/* Vercel Web Analytics: cookieless, aggregate page views (no consent needed). */}
            <Analytics />
          </PlanProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
