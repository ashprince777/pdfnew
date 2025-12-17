import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import PdfToJpgClient from './PdfToJpgClient';

export const metadata: Metadata = {
    title: 'PDF to JPG Converter - Convert PDF Pages to Images | MyOnlinePDF',
    description: 'Convert PDF pages to high-quality JPG images. Extract every page as a separate image file instantly.',
    alternates: {
        canonical: '/pdf-to-jpg',
    },
};

const faqItems = [
    {
        question: 'How do I convert PDF to JPG?',
        answer: 'Upload your PDF. We will convert each page into a separate JPG image. You can download them individually or as a ZIP file.'
    },
    {
        question: 'What is the image quality?',
        answer: 'We generate high-resolution JPGs suitable for printing and sharing.'
    }
];

const benefits = [
    "Share PDF content on social media (Instagram, Facebook).",
    "Insert PDF pages into Word or PowerPoint as images.",
    "View documents on devices that don't support PDF.",
    "Extract photos from PDF files."
];

export default function PdfToJpgPage() {
    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'PDF to JPG', item: '/pdf-to-jpg' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <PdfToJpgClient />

            <ToolSeoContent
                toolName="PDF to JPG"
                actionName="Convert"
                actionDescription="convert PDF to JPG"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
