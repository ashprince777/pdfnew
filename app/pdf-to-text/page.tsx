import { seoMetadata } from '@/lib/seoOverrides';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import JsonLd from '@/components/JsonLd';
import { toolSchema } from '@/lib/seo';
import PdfToTextClient from './PdfToTextClient';

export const generateMetadata = () => seoMetadata('/pdf-to-text');

const faqItems = [
    {
        question: "How do I extract text from a PDF?",
        answer: "Upload your PDF and click \"Extract text\". PDFAdore reads the text of every page and gives you a plain .txt file that opens in Notepad, Word, Google Docs or any phone.",
    },
    {
        question: "Can I get text from a scanned PDF?",
        answer: "Yes. With \"Use OCR\" selected, pages that are only images (scans or phone photos) are read with optical character recognition on your own device. OCR currently reads English text, so check the result for small mistakes.",
    },
    {
        question: "Does it keep tables and formatting?",
        answer: "No. A .txt file holds plain text only, so fonts, colours and table borders are dropped while the reading order is kept. To keep the layout, use PDF to Word instead.",
    },
    {
        question: "Is my PDF uploaded?",
        answer: "No. Text extraction and OCR both run inside your browser. Your PDF never leaves your device.",
    },
];

const benefits = [
    "Copy text out of a PDF that will not let you select it properly.",
    "Turn a scanned letter, notice or certificate into searchable, editable text.",
    "Paste PDF content into an email, WhatsApp message or AI chat.",
    "Feed PDF text into a spreadsheet, script or translation tool.",
];

export default function PdfToTextPage() {
    return (
        <>
            <JsonLd data={toolSchema('/pdf-to-text')} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'PDF to Text', item: '/pdf-to-text' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <PdfToTextClient />

            <ToolSeoContent
                toolName="PDF to Text"
                actionName="Extract Text from"
                actionDescription="extract text from a PDF"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
