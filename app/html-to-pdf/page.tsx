import type { Metadata } from 'next';
import HtmlToPdfClient from './HtmlToPdfClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';

export const metadata: Metadata = {
    title: 'HTML to PDF Online - Convert Webpages to PDF Free | MyOnlinePDF',
    description: 'Convert HTML files to PDF online. Upload your HTML file and download a PDF version. Free and secure.',
    alternates: {
        canonical: '/html-to-pdf',
    },
};

const faqItems = [
    {
        question: 'How do I convert HTML to PDF?',
        answer: 'Upload your .html file or paste HTML code, click "Convert to PDF", and download.'
    },
    {
        question: 'Does it support CSS styling?',
        answer: 'Basic inline styles are rendered. External stylesheets are not loaded for security reasons.'
    },
    {
        question: 'Is it free?',
        answer: 'Yes, completely free with no limits.'
    }
];

const benefits = [
    "Save web pages as PDF for offline reading.",
    "Archive important web content permanently.",
    "Create PDF reports from HTML templates.",
    "Share formatted documents across platforms."
];

export default function HtmlToPdfPage() {
    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'HTML to PDF', item: '/html-to-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <HtmlToPdfClient />

            <ToolSeoContent
                toolName="HTML to PDF"
                actionName="Convert"
                actionDescription="convert your HTML files to PDF"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
