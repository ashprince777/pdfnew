import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import WordToPdfClient from './WordToPdfClient';

export const metadata: Metadata = {
    title: 'Word to PDF Converter - Convert Docx to PDF Online | MyOnlinePDF',
    description: 'Convert Microsoft Word documents to PDF format online. Create professional, non-editable documents for sharing and printing.',
    alternates: {
        canonical: '/word-to-pdf',
    },
};

const faqItems = [
    {
        question: 'How do I convert Word to PDF?',
        answer: 'Upload your .doc or .docx file. Our tool will instantly generate a PDF version that looks exactly like your original document.'
    },
    {
        question: 'Do I need Microsoft Word installed?',
        answer: 'No. Our conversion happens in the cloud, so you don\'t need any office software installed on your device.'
    },
    {
        question: 'Is it free?',
        answer: 'Yes, you can convert Word documents to PDF for free.'
    }
];

const benefits = [
    "Ensure your document looks the same on every device.",
    "Prevent accidental edits to your final draft.",
    "Create professional documents for email or print.",
    "Compatible with .doc and .docx formats."
];

export default function WordToPdfPage() {
    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Word to PDF', item: '/word-to-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <WordToPdfClient />

            <ToolSeoContent
                toolName="Word to PDF"
                actionName="Convert"
                actionDescription="convert Word to PDF"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
