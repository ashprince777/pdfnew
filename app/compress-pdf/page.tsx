import type { Metadata } from 'next';
import CompressClient from './CompressClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';

export const metadata: Metadata = {
    title: 'Compress PDF - Reduce PDF Size Online Free (to 100KB, 200KB)',
    description: 'Reduce PDF size online for free: compress to a specific size like 100 KB or 200 KB for government forms, or shrink files for email. No upload, no sign-up.',
    alternates: {
        canonical: '/compress-pdf',
    },
};

const faqItems = [
    {
        question: 'How do I compress a PDF file?',
        answer: 'Upload your PDF and click "Compress PDF". Our tool optimizes the file structure to reduce its size while maintaining quality.'
    },
    {
        question: 'Does compression reduce quality?',
        answer: 'We remove unnecessary metadata and optimize internal structures. Visually, the document quality remains excellent for screen viewing and printing.'
    },
    {
        question: 'Is it safe to compress my PDF?',
        answer: 'Yes, compression creates a new optimized version of your file locally. Your original file remains untouched and secure.'
    },
    {
        question: 'Can I reduce a PDF to a specific size like 200 KB?',
        answer: 'Yes. Choose "Fit to a size" and enter the limit, for example 100 KB or 200 KB. PDFAdore keeps as much quality as the limit allows.'
    },
    {
        question: 'How much space can I save?',
        answer: 'Savings vary depending on the file content. Text-heavy files might see small reductions, while image-heavy PDFs can often be compressed significantly.'
    }
];

const benefits = [
    "Reduce file size for email attachments (bypass 25MB limits).",
    "Speed up file uploads to government or school portals.",
    "Save storage space on your device or cloud drive.",
    "Improve website loading times if you host the PDF."
];

export default function CompressPdfPage() {
    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Compress PDF', item: '/compress-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <CompressClient />

            <ToolSeoContent
                toolName="Compress PDF"
                actionName="Compress"
                actionDescription="reduce the size of your PDF"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
