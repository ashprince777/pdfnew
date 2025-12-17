import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import JpgToPdfClient from './JpgToPdfClient';

export const metadata: Metadata = {
    title: 'JPG to PDF Converter - Convert Images to PDF | MyOnlinePDF',
    description: 'Convert JPG, PNG, and other images to PDF format. Combine multiple photos into a single PDF document.',
    alternates: {
        canonical: '/jpg-to-pdf',
    },
};

const faqItems = [
    {
        question: 'How do I convert JPG to PDF?',
        answer: 'Upload your images (JPG, PNG, etc.). Drag to reorder them if needed, then click "Convert" to create a single PDF file containing all your photos.'
    },
    {
        question: 'Can I combine multiple images?',
        answer: 'Yes! You can upload dozens of images and combine them into one organized PDF album.'
    }
];

const benefits = [
    "Create a PDF photo album to share easily.",
    "Convert scanned paperwork photos into a professional document.",
    "Standardize image formats for printing.",
    "Reduce file clutter by combining images."
];

export default function JpgToPdfPage() {
    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'JPG to PDF', item: '/jpg-to-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <JpgToPdfClient />

            <ToolSeoContent
                toolName="JPG to PDF"
                actionName="Convert"
                actionDescription="convert images to PDF"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
