import type { Metadata } from 'next';
import HtmlToPdfClient from './HtmlToPdfClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import { pageMetadata, toolSchema } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = pageMetadata('/html-to-pdf');

const faqItems = [
    {
        question: 'How do I convert HTML to PDF?',
        answer: 'Upload your .html file or paste HTML code, click "Convert to PDF", and download.'
    },
    {
        question: 'Does it support CSS styling?',
        answer: 'Basic inline styles are rendered. External stylesheets are not loaded for security reasons.'
    },
    {
        question: 'Is it free?',
        answer: 'Yes, completely free with no limits.'
    }
];

const benefits = [
    "Save web pages as PDF for offline reading.",
    "Archive important web content permanently.",
    "Create PDF reports from HTML templates.",
    "Share formatted documents across platforms."
];

export default function HtmlToPdfPage() {
    return (
        <>
            <JsonLd data={toolSchema('/html-to-pdf')} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'HTML to PDF', item: '/html-to-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <HtmlToPdfClient />

            <ToolSeoContent
                toolName="HTML to PDF"
                actionName="Convert"
                actionDescription="convert your HTML files to PDF"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
