"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getConsent, setConsent } from '@/lib/storage';

const ANALYTICS_ENABLED = Boolean(process.env.NEXT_PUBLIC_GA_ID);

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Without analytics configured the site sets no cookies, so there is nothing to ask.
        if (!ANALYTICS_ENABLED || getConsent() !== null) return;
        const timer = setTimeout(() => setIsVisible(true), 0);
        return () => clearTimeout(timer);
    }, []);

    const choose = (value: 'accepted' | 'declined') => {
        setConsent(value);
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div
            role="dialog"
            aria-live="polite"
            aria-label="Cookie consent"
            style={{
                position: 'fixed',
                left: 16,
                right: 16,
                bottom: 16,
                zIndex: 900,
                maxWidth: 720,
                margin: '0 auto',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 16,
                padding: 16,
                background: 'var(--card-surface)',
                color: 'var(--text-color)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-lg)',
            }}
        >
            <p style={{ flex: '1 1 320px', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
                We&apos;d like to use Google Analytics cookies to understand how the site is used. Your files are never
                uploaded either way.{' '}
                <Link href="/privacy" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                    Privacy Policy
                </Link>
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-outline" onClick={() => choose('declined')} style={{ padding: '8px 16px' }}>
                    Decline
                </button>
                <button type="button" className="btn btn-primary" onClick={() => choose('accepted')} style={{ padding: '8px 16px' }}>
                    Accept
                </button>
            </div>
        </div>
    );
}
