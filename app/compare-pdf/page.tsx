import type { Metadata } from 'next';
import ComparePdfClient from './ComparePdfClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';

export const metadata: Metadata = {
    title: 'Compare PDF Online Free - Find Differences in PDF Documents',
    description: 'Compare two PDF documents side by side to detect text changes, additions, and deletions online for free. Fast, private, and secure.',
    alternates: {
        canonical: '/compare-pdf',
    },
};

const faqItems = [
    {
        question: 'How do I compare two PDF files online?',
        answer: 'Upload File 1 (Original) and File 2 (Modified), then click "Compare Documents". Our tool compares content page by page and highlights differences.'
    },
    {
        question: 'What do the red and green highlights mean?',
        answer: 'Red highlights indicate text that was deleted from the original document. Green highlights indicate text that was added to the revised document.'
    },
    {
        question: 'Can I export a PDF report of the differences?',
        answer: 'Yes! After the comparison is complete, click "Download Report PDF" to save an executive summary of all identified changes.'
    }
];

const benefits = [
    "Verify contract revisions, agreement changes, or draft updates.",
    "Synchronized side-by-side view with color-coded diff markers.",
    "Exportable PDF comparison report with statistics per page.",
    "100% private and computed within your browser."
];

export default function ComparePdfPage() {
    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Compare PDF', item: '/compare-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <ComparePdfClient />

            <ToolSeoContent
                toolName="Compare PDF"
                actionName="Compare"
                actionDescription="compare two PDF files and find differences"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
