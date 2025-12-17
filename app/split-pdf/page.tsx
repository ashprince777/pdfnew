import type { Metadata } from 'next';
import SplitClient from './SplitClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';

export const metadata: Metadata = {
    title: 'Split PDF Online - Extract Pages from PDF Free | MyOnlinePDF',
    description: 'Split PDF files online. Extract specific pages or save every page as a separate document. Fast, private, and free.',
    alternates: {
        canonical: '/split-pdf',
    },
};

const faqItems = [
    {
        question: 'How do I split a PDF file?',
        answer: 'Upload your PDF, choose to extract all pages or specific ranges, and click Split. Download your files instantly.'
    },
    {
        question: 'Can I extract multiple page ranges?',
        answer: 'Yes! You can specify ranges like "1-5, 8, 10-12" to extract exactly what you need into a new PDF.'
    },
    {
        question: 'Is my data safe?',
        answer: 'Absolutely. All splitting happens in your browser. Your files are never uploaded to our servers.'
    },
    {
        question: 'Is there a file size limit?',
        answer: 'Since we process files locally, the limit depends on your device memory, but we handle large files efficiently.'
    }
];

const benefits = [
    "Extract specific chapters from a large book or report.",
    "Separate a single page invoice from a bundle.",
    "Break down a massive document into manageable sections.",
    "Remove unwanted pages by extracting only the good ones."
];

export default function SplitPdfPage() {
    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Split PDF', item: '/split-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <SplitClient />

            <ToolSeoContent
                toolName="Split PDF"
                actionName="Split"
                actionDescription="extract pages from your PDF"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
