import type { Metadata } from 'next';
import RemovePagesClient from './RemovePagesClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';

export const metadata: Metadata = {
    title: 'Remove Pages from PDF Online Free - Delete PDF Pages | MyOnlinePDF',
    description: 'Delete unwanted pages from your PDF documents online for free. Select pages visually or by page number range. 100% private and secure.',
    alternates: {
        canonical: '/remove-pages',
    },
};

const faqItems = [
    {
        question: 'How do I delete pages from a PDF?',
        answer: 'Upload your PDF, click on the thumbnails of the pages you want to delete (or enter a page range like "1, 3, 5-8"), and click "Remove Pages".'
    },
    {
        question: 'Can I remove multiple pages at once?',
        answer: 'Yes! You can click multiple pages or enter comma-separated numbers and ranges to delete all unwanted pages in one step.'
    },
    {
        question: 'Are my uploaded documents stored on your server?',
        answer: 'No. All processing happens right inside your web browser. Your confidential files never leave your computer.'
    }
];

const benefits = [
    "Quickly delete blank, redundant, or sensitive pages.",
    "Visual thumbnail grid lets you preview pages before deleting.",
    "Support for single pages and custom range expressions (e.g. 2, 4-6).",
    "Completely free, fast, and processed 100% locally in your browser."
];

export default function RemovePagesPage() {
    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Remove Pages', item: '/remove-pages' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <RemovePagesClient />

            <ToolSeoContent
                toolName="Remove Pages from PDF"
                actionName="Remove"
                actionDescription="remove unwanted pages from your PDF files"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
