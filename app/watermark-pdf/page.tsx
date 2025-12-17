import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import WatermarkPdfClient from './WatermarkPdfClient';

export const metadata: Metadata = {
    title: 'Add Watermark to PDF Online - Free PDF Watermarker | MyOnlinePDF',
    description: 'Add text or image watermarks to your PDF documents online. Protect your copyright and branding instantly for free.',
    alternates: {
        canonical: '/watermark-pdf',
    },
};

const faqItems = [
    {
        question: 'How do I add a watermark to a PDF?',
        answer: 'Upload your PDF, choose your watermark type (text or image), customize position and opacity, then click "Apply Watermark".'
    },
    {
        question: 'Can I batch watermark files?',
        answer: 'Yes, you can upload multiple files and apply the same watermark to all of them at once.'
    },
    {
        question: 'Is it free?',
        answer: 'Yes, our watermarking tool is 100% free with no limits on the number of files.'
    },
    {
        question: 'Is my document secure?',
        answer: 'All processing happens locally in your browser. Your sensitive documents never leave your computer.'
    }
];

const benefits = [
    "Protect your intellectual property with visible watermarks.",
    "Add 'Draft', 'Confidential', or 'Sample' stamps to documents.",
    "Brand your documents with your company logo.",
    " Prevent unauthorized copying or distribution."
];

export default function WatermarkPdfPage() {
    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Watermark PDF', item: '/watermark-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <WatermarkPdfClient />

            <ToolSeoContent
                toolName="Watermark PDF"
                actionName="Watermark"
                actionDescription="add stamps to your PDF"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
