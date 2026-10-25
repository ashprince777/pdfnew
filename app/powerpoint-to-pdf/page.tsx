import type { Metadata } from 'next';
import PowerpointToPdfClient from './PowerpointToPdfClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import { pageMetadata, toolSchema } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = pageMetadata('/powerpoint-to-pdf');

const faqItems = [
    {
        question: 'How do I convert PowerPoint to PDF?',
        answer: 'Upload your PPT or PPTX file, click "Convert to PDF", and download your converted file.'
    },
    {
        question: 'Does the conversion preserve formatting?',
        answer: 'We extract text content from your presentation and render it into a clean PDF format. Complex animations and transitions are not preserved.'
    },
    {
        question: 'Is it free?',
        answer: 'Yes, completely free with no limits.'
    }
];

const benefits = [
    "Share presentations as universally viewable PDFs.",
    "Ensure consistent formatting across all devices.",
    "Reduce file size for email attachments.",
    "Protect your presentation from accidental edits."
];

export default function PowerpointToPdfPage() {
    return (
        <>
            <JsonLd data={toolSchema('/powerpoint-to-pdf')} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'PowerPoint to PDF', item: '/powerpoint-to-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <PowerpointToPdfClient />

            <ToolSeoContent
                toolName="PowerPoint to PDF"
                actionName="Convert"
                actionDescription="convert your PowerPoint presentations to PDF"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
