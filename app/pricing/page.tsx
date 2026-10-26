import { seoMetadata } from '@/lib/seoOverrides';
import PricingClient from './PricingClient';
import { breadcrumbSchema } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const generateMetadata = () => seoMetadata('/pricing');

export default async function PricingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams;
    return (
        <>
            <JsonLd data={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Pricing', path: '/pricing' }])} />
            <PricingClient initialInterval={params.interval === 'monthly' ? 'monthly' : 'yearly'} autoCheckout={params.checkout === '1'} />
        </>
    );
}
