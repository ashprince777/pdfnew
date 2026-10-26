import { seoMetadata } from '@/lib/seoOverrides';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import JsonLd from '@/components/JsonLd';
import { toolSchema } from '@/lib/seo';
import PdfToJpgClient from '../pdf-to-jpg/PdfToJpgClient';

export const generateMetadata = () => seoMetadata('/pdf-to-png');

const faqItems = [
    {
        question: "How do I convert a PDF to PNG?",
        answer: "Upload your PDF, keep PNG selected, choose a resolution and click \"Convert\". A one-page PDF gives you a PNG; longer PDFs give you a ZIP with one PNG per page.",
    },
    {
        question: "PNG or JPG: which should I choose?",
        answer: "PNG is lossless, so text, line art and screenshots stay crisp. JPG files are smaller and better for photos. Use 300 DPI PNG for printing or presentations.",
    },
    {
        question: "Why is my PNG file large?",
        answer: "PNG keeps every pixel exactly, so pages full of photos can be big. Pick 96 or 150 DPI, or switch to JPG, for smaller files.",
    },
    {
        question: "Is my PDF uploaded?",
        answer: "No. Pages are rendered to images inside your browser and the PDF never leaves your device.",
    },
];

const benefits = [
    "Put a PDF page into a presentation, document or design tool as a crisp image.",
    "Share a page on social media or chat apps that do not preview PDFs.",
    "Keep sharp text for slides, diagrams and screenshots without JPG blur.",
    "Make images with exact colours for printing or editing.",
];

export default function PdfToPngPage() {
    return (
        <>
            <JsonLd data={toolSchema('/pdf-to-png', { name: 'PDF to PNG' })} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'PDF to JPG', item: '/pdf-to-jpg' },
                    { name: 'PDF to PNG', item: '/pdf-to-png' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <PdfToJpgClient title="PDF to PNG" subtitle="Convert each PDF page into a sharp, lossless PNG image." defaultFormat="png" />

            <ToolSeoContent
                toolName="PDF to PNG"
                actionName="Convert"
                actionDescription="convert PDF pages to PNG images"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
