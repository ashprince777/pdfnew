import type { Metadata } from 'next';
import SignPdfClient from './SignPdfClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import { pageMetadata, toolSchema } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = pageMetadata('/sign-pdf');

const faqItems = [
    {
        question: 'How do I sign a PDF online?',
        answer: 'Upload your document, draw your signature with your mouse or touchscreen (or type your name), pick the page and position, then click "Sign & Download PDF".'
    },
    {
        question: 'Is my electronic signature secure?',
        answer: 'Yes! Processing happens directly inside your web browser. Your signature and document are never uploaded to any remote server.'
    },
    {
        question: 'Can I choose which page to sign?',
        answer: 'Yes, you can place your signature on the last page, first page, all pages, or select any specific page number.'
    }
];

const benefits = [
    "Sign contracts, invoices, agreements, and tax forms quickly.",
    "Draw naturally or type your name with handwriting font.",
    "Choose between blue or black ink colors.",
    "Completely free with no account or registration required."
];

export default function SignPdfPage() {
    return (
        <>
            <JsonLd data={toolSchema('/sign-pdf')} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Sign PDF', item: '/sign-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <SignPdfClient />

            <ToolSeoContent
                toolName="Sign PDF"
                actionName="Sign"
                actionDescription="sign PDF documents online"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
