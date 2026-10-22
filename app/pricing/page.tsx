import type { Metadata } from 'next';
import { Suspense } from 'react';
import PricingClient from './PricingClient';

export const metadata: Metadata = {
    title: 'Pricing - Free & Premium Plans',
    description: 'MyOnlinePDF is free for everyday PDF tasks. Premium unlocks bigger files, more files per task, OCR and pro features. Your files never leave your device.',
    alternates: { canonical: '/pricing' },
};

export default function PricingPage() {
    return (
        <Suspense>
            <PricingClient />
        </Suspense>
    );
}
