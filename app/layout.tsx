import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CookieConsent from '@/components/CookieConsent';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { ToastProvider } from '@/components/ToastProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://myonlinepdf.com'),
  title: {
    default: 'MyOnlinePDF - Free PDF Tools (Merge, Split, Convert)',
    template: '%s | MyOnlinePDF',
  },
  description: 'Free, fast, and secure online PDF tools. Merge, split, compress, protect, and convert PDFs directly in your browser. No registration required.',
  keywords: ['pdf tools', 'merge pdf', 'split pdf', 'compress pdf', 'convert pdf', 'free pdf editor', 'unlock pdf', 'protect pdf'],
  authors: [{ name: 'MyOnlinePDF' }],
  creator: 'MyOnlinePDF',
  publisher: 'MyOnlinePDF',
  alternates: {
    canonical: './',
  },
  openGraph: {
    title: 'MyOnlinePDF - All-in-One PDF Tools',
    description: 'Merge, split, compress, and convert PDFs for free. Secure, client-side processing.',
    url: 'https://myonlinepdf.com',
    siteName: 'MyOnlinePDF',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MyOnlinePDF',
    description: 'Free & Secure Online PDF Tools',
    creator: '@_MyOnlinePDF',
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
      <body className={inter.className}>
        <ToastProvider>
          <Navbar />
          <main style={{ minHeight: 'calc(100vh - 200px)' }}>
            {children}
          </main>
          <Footer />
          <CookieConsent />
          <GoogleAnalytics />
        </ToastProvider>
      </body>
    </html>
  );
}
