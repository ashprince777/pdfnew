import { seoMetadata } from '@/lib/seoOverrides';
import ScanToPdfClient from './ScanToPdfClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import { toolSchema } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const generateMetadata = () => seoMetadata('/scan-to-pdf');

const faqItems = [
    {
        question: 'How do I scan a document to PDF with my phone?',
        answer: 'Open this page on your phone, tap "Open camera", capture each page, then tap Done and "Create PDF".',
    },
    {
        question: 'What does the Document look do?',
        answer: 'It converts the photo to black and white, whitens the paper and darkens the text, so the scan looks like it came from a flatbed scanner.',
    },
    {
        question: 'Can I use photos I already took?',
        answer: 'Yes. Use "Add images" to pick existing photos, then reorder, rotate or delete pages before creating the PDF.',
    },
    {
        question: 'Are my scans uploaded?',
        answer: 'No. The camera image is processed on your device and never sent to a server.',
    },
];

const benefits = [
    'Capture many pages in a row with the back camera.',
    'Document filter for crisp, readable black and white scans.',
    'Rotate, reorder and delete pages before saving.',
    'No app to install, and nothing is uploaded.',
];

export default function ScanToPdfPage() {
    return (
        <>
            <JsonLd data={toolSchema('/scan-to-pdf')} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Scan to PDF', item: '/scan-to-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <ScanToPdfClient />

            <ToolSeoContent
                toolName="Scan to PDF"
                actionName="Scan"
                actionDescription="scan paper documents into PDF with your camera"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
