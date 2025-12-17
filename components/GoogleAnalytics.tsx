import React from 'react';
import Script from 'next/script';

export default function GoogleAnalytics({ gaId }: { gaId?: string }) {
    // If no ID provided, do not render.
    // In production, user should provide NEXT_PUBLIC_GA_ID or similar.
    const id = gaId || process.env.NEXT_PUBLIC_GA_ID;

    if (!id) return null;

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
                strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
                {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${id}');
        `}
            </Script>
        </>
    );
}
