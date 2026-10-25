import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import JsonLd from '@/components/JsonLd';
import { pageMetadata, toolSchema } from '@/lib/seo';
import JpgToPdfClient from '../jpg-to-pdf/JpgToPdfClient';

export const metadata: Metadata = pageMetadata('/png-to-pdf');

const faqItems = [
    {
        question: "How do I convert PNG to PDF?",
        answer: "Select your PNG files, drag them into the right order, choose a page size and margin, then click \"Convert\". You get one PDF with each image on its own page.",
    },
    {
        question: "Will my PNG lose quality?",
        answer: "Images are placed on the page at full resolution, so screenshots and text stay sharp. Transparent areas show as white, because PDF pages have a white background.",
    },
    {
        question: "Can I mix PNG and JPG files?",
        answer: "Yes. You can add PNG, JPG, WebP, GIF and BMP images to the same PDF.",
    },
    {
        question: "Are my images uploaded?",
        answer: "No. The PDF is created in your browser, so your images never leave your phone or computer.",
    },
];

const benefits = [
    "Combine app or website screenshots into one PDF to share or submit.",
    "Turn PNG certificates, tickets and receipts into a single document.",
    "Send design mock-ups or charts as one easy-to-open file.",
    "Make a PDF from PNG scans for an online form that only accepts PDF.",
];

export default function PngToPdfPage() {
    return (
        <>
            <JsonLd data={toolSchema('/png-to-pdf', { name: 'PNG to PDF' })} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'JPG to PDF', item: '/jpg-to-pdf' },
                    { name: 'PNG to PDF', item: '/png-to-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <JpgToPdfClient title="PNG to PDF" subtitle="Convert PNG images and screenshots into a single PDF, in the order you choose." />

            <ToolSeoContent
                toolName="PNG to PDF"
                actionName="Convert"
                actionDescription="convert PNG images to PDF"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
