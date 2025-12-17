import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AdUnit from '@/components/AdUnit';
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
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'MyOnlinePDF Tools',
      },
    ],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ToastProvider>
          <Navbar />
          <div className="container">
            <AdUnit slot="header-ad" />
          </div>
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
