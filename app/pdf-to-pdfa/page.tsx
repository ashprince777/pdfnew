import type { Metadata } from 'next';
import PdfToPdfaClient from './PdfToPdfaClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';

export const metadata: Metadata = {
    title: 'PDF to PDF/A Converter Online Free - ISO Archival Standard',
    description: 'Convert PDF files to ISO standardized PDF/A-1b and PDF/A-2b format for long term archiving. Free, secure, and processed in your browser.',
    alternates: {
        canonical: '/pdf-to-pdfa',
    },
};

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
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
