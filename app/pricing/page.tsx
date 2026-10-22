import type { Metadata } from 'next';
import PricingClient from './PricingClient';

export const metadata: Metadata = {
    title: 'Pricing - Free & Premium Plans',
    description: 'PDFAdore is free for everyday PDF tasks. Premium unlocks bigger files, more files per task, OCR and pro features. Your files never leave your device.',
    alternates: { canonical: '/pricing' },
};

export default async function PricingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams;
    return <PricingClient initialInterval={params.interval === 'monthly' ? 'monthly' : 'yearly'} autoCheckout={params.checkout === '1'} />;
}
