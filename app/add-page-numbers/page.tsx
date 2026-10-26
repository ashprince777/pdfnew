import { seoMetadata } from '@/lib/seoOverrides';
import PageNumbersClient from './PageNumbersClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import { toolSchema } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const generateMetadata = () => seoMetadata('/add-page-numbers');

const faqItems = [
    {
        question: 'How do I add page numbers to a PDF?',
        answer: 'Upload your PDF, choose where you want numbers placed (e.g. bottom-right, bottom-center), select your preferred format, and click "Add Page Numbers".'
    },
    {
        question: 'Can I customize the numbering format?',
        answer: 'Yes! You can choose simple numbers (1, 2, 3), "Page X", or "Page X of Y", and set the starting number.'
    },
    {
        question: 'Is my document private and secure?',
        answer: 'Yes, your document is processed entirely in your browser using client-side JavaScript. It never leaves your computer.'
    }
];

const benefits = [
    "Number pages in research papers, books, or legal briefs.",
    "Choose exact position: bottom right, center, or top corners.",
    "Supports 'Page X of Y' for professional reporting.",
    "Runs 100% locally in your browser for total confidentiality."
];

export default function AddPageNumbersPage() {
    return (
        <>
            <JsonLd data={toolSchema('/add-page-numbers')} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Add Page Numbers', item: '/add-page-numbers' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <PageNumbersClient />

            <ToolSeoContent
                toolName="Add Page Numbers"
                actionName="Number"
                actionDescription="add page numbers to PDF documents"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
