"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    const acceptCookies = () => {
        localStorage.setItem('cookie-consent', 'accepted');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-red-500 shadow-lg p-4 z-50 md:flex md:items-center md:justify-between">
            <div className="text-sm text-gray-700 mb-4 md:mb-0 md:mr-8">
                <p>
                    We use cookies to personalize content and ads, to provide social media features and to analyze our traffic.
                    We also share information about your use of our site with our social media, advertising and analytics partners.
                    <Link href="/privacy" className="ml-1 text-red-600 underline">Read our Privacy Policy</Link>.
                </p>
            </div>
            <div className="flex gap-4">
                <button
                    onClick={acceptCookies}
                    className="bg-red-600 text-white px-6 py-2 rounded-md font-medium hover:bg-red-700 transition-colors whitespace-nowrap"
                >
                    Accept All
                </button>
            </div>
        </div>
    );
}
