import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import RotatePdfClient from './RotatePdfClient';
import { pageMetadata, toolSchema } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = pageMetadata('/rotate-pdf');

const faqItems = [
    {
        question: 'How do I rotate a PDF?',
        answer: 'Upload your file, select the pages you want to rotate (or all of them), choose the direction (left/right), and click "Rotate PDF".'
    },
    {
        question: 'Can I rotate just one page?',
        answer: 'Yes! You can preview your document and select individual pages to rotate while leaving others upright.'
    }
];

const benefits = [
    "Fix scanned documents that are upside down.",
    "Rotate landscape pages to portrait for printing.",
    "Organize mixed-orientation documents.",
    "Permanent rotation saved to the new file."
];

export default function RotatePdfPage() {
    return (
        <>
            <JsonLd data={toolSchema('/rotate-pdf')} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Rotate PDF', item: '/rotate-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <div className="container py-12 text-center">
                <h1 className="text-4xl font-bold mb-4">Rotate PDF</h1>
                <p className="text-muted mb-8 text-lg">Rotate your PDF pages permanently.</p>

                {/* Placeholder for Client Logic - Ideally inject RotateClient here if it exists */}
                <RotatePdfClient />
            </div>

            <ToolSeoContent
                toolName="Rotate PDF"
                actionName="Rotate"
                actionDescription="rotate pages in your PDF"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
