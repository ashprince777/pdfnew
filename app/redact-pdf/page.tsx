import type { Metadata } from 'next';
import RedactPdfClient from './RedactPdfClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';

export const metadata: Metadata = {
    title: 'Redact PDF Online Free - Permanently Remove Sensitive Text',
    description: 'Black out names, account numbers and other private information in a PDF. Redacted content is permanently removed, not just covered. Free and private.',
    alternates: {
        canonical: '/redact-pdf',
    },
};

const faqItems = [
    {
        question: 'How do I redact a PDF?',
        answer: 'Upload your PDF, type a word or number and click "Mark all", or drag boxes over any area of the page. Then click "Redact PDF" and download the result.',
    },
    {
        question: 'Is the redacted text really removed?',
        answer: 'Yes. Every page with a redaction is re-created as an image with the areas blacked out, so the original text, images and form values underneath are gone and cannot be copied, searched or recovered.',
    },
    {
        question: 'Can I redact scanned PDFs?',
        answer: 'Yes. Scanned pages have no searchable text, so draw boxes over the areas you want to hide.',
    },
    {
        question: 'Are my files uploaded?',
        answer: 'No. Redaction happens entirely in your browser. Your document never leaves your device.',
    },
];

const benefits = [
    'Find and mark every occurrence of a name or number in one click.',
    'Draw boxes over signatures, photos or any other area.',
    'True redaction: hidden content is removed, not just covered with a black box.',
    'Optionally remove metadata and attachments that could leak information.',
];

export default function RedactPdfPage() {
    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Redact PDF', item: '/redact-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <RedactPdfClient />

            <ToolSeoContent
                toolName="Redact PDF"
                actionName="Redact"
                actionDescription="permanently remove sensitive information from your PDF files"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
