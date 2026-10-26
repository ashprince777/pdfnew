import { seoMetadata } from '@/lib/seoOverrides';
import PdfToPdfaClient from './PdfToPdfaClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import { toolSchema } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const generateMetadata = () => seoMetadata('/pdf-to-pdfa');

const faqItems = [
    {
        question: 'What is PDF/A?',
        answer: 'PDF/A is an ISO-standardized version of the Portable Document Format (PDF) specialized for long-term archiving and preservation of electronic documents.'
    },
    {
        question: 'What is the difference between PDF/A-1b and PDF/A-2b?',
        answer: 'PDF/A-1b is the most widely supported standard, ensuring reliable visual reproduction. PDF/A-2b is based on PDF 1.7 and adds support for transparency and compressed object streams.'
    },
    {
        question: 'Who requires PDF/A compliance?',
        answer: 'Courts, government agencies, universities, patent offices, and financial institutions worldwide require PDF/A compliance for official record keeping.'
    }
];

const benefits = [
    "Ensure documents can be opened and accurately read decades into the future.",
    "Embeds complete XMP metadata structure and removes non-standard dependencies.",
    "Meets compliance requirements for courts, legal archiving, and academic submission.",
    "Free, fast, and processed directly inside your browser."
];

export default function PdfToPdfaPage() {
    return (
        <>
            <JsonLd data={toolSchema('/pdf-to-pdfa')} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'PDF to PDF/A', item: '/pdf-to-pdfa' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <PdfToPdfaClient />

            <ToolSeoContent
                toolName="PDF to PDF/A"
                actionName="Convert"
                actionDescription="convert your PDF files into archival PDF/A standard"
                premium
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
