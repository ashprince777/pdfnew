import type { Metadata } from 'next';
import PdfToPowerpointClient from './PdfToPowerpointClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';

export const metadata: Metadata = {
    title: 'PDF to PowerPoint Converter - Convert PDF to PPTX Online | MyOnlinePDF',
    description: 'Convert your PDF files to editable PowerPoint presentations (PPTX) online for free. No registration needed.',
    keywords: ['pdf to powerpoint', 'pdf to pptx', 'convert pdf to pptx', 'free pdf converter'],
    alternates: {
        canonical: 'https://myonlinepdf.com/pdf-to-powerpoint',
    },
};

const faqItems = [
    { question: 'How does PDF to PowerPoint conversion work?', answer: 'Each page of your PDF is rendered as a high-quality image and placed onto a PowerPoint slide.' },
    { question: 'Will the text be editable in the PPTX?', answer: 'The current conversion embeds each page as an image. For editable text, use a dedicated OCR-based converter.' },
    { question: 'Is it free to use?', answer: 'Yes, this tool is completely free with no registration required.' },
];

const benefits = [
    "Convert PDF pages into high-resolution presentation slides.",
    "Present your PDF documents easily using Microsoft PowerPoint.",
    "Processed 100% in your browser for maximum privacy and security.",
    "Fast, free, and no registration required."
];

export default function PdfToPowerpointPage() {
    return (
        <>
            <BreadcrumbSchema items={[
                { name: 'Home', item: '/' },
                { name: 'PDF to PowerPoint', item: '/pdf-to-powerpoint' },
            ]} />
            <FaqSchema items={faqItems} />
            <PdfToPowerpointClient />
            <ToolSeoContent
                toolName="PDF to PowerPoint"
                actionName="Convert"
                actionDescription="convert your PDF documents into PowerPoint presentations"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
