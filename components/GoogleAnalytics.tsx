"use client";
import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { CONSENT_EVENT, getConsent } from '@/lib/storage';

/** Loads Google Analytics only when an ID is configured and the visitor has accepted cookies. */
export default function GoogleAnalytics({ gaId }: { gaId?: string }) {
    const id = gaId || process.env.NEXT_PUBLIC_GA_ID;
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        if (!id) return;
        const sync = () => setAllowed(getConsent() === 'accepted');
        sync();
        window.addEventListener(CONSENT_EVENT, sync);
        return () => window.removeEventListener(CONSENT_EVENT, sync);
    }, [id]);

    if (!id || !allowed) return null;

    return (
        <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
                {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', ${JSON.stringify(id)}, { anonymize_ip: true });
        `}
            </Script>
        </>
    );
}
