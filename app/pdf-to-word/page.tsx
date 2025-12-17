import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import PdfToWordClient from './PdfToWordClient';

export const metadata: Metadata = {
    title: 'PDF to Word Converter - Convert PDF to Docx Online | MyOnlinePDF',
    description: 'Convert PDF files to editable Microsoft Word documents (Docx) online. accurate conversion with original formatting preserved.',
    alternates: {
        canonical: '/pdf-to-word',
    },
};

const faqItems = [
    {
        question: 'How do I convert PDF to Word?',
        answer: 'Upload your PDF file and click "Convert". Our engine extracts the text and formatting to create an editable Word document.'
    },
    {
        question: 'Will the formatting remain the same?',
        answer: 'We strive to keep the original layout, fonts, and images as close to the original PDF as possible.'
    },
    {
        question: 'Is it editable?',
        answer: 'Yes, the output is a standard .docx file that you can edit in Microsoft Word, Google Docs, or any compatible office suite.'
    }
];

const benefits = [
    "Turn read-only PDFs into editable documents.",
    "Fix typos or update content without the original source file.",
    "Extract text and images easily.",
    "Compatible with all versions of Microsoft Word."
];

export default function PdfToWordPage() {
    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'PDF to Word', item: '/pdf-to-word' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <PdfToWordClient />

            <ToolSeoContent
                toolName="PDF to Word"
                actionName="Convert"
                actionDescription="convert PDF to Word"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
