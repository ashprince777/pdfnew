import { seoMetadata } from '@/lib/seoOverrides';
import CropPdfClient from './CropPdfClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import { toolSchema } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const generateMetadata = () => seoMetadata('/crop-pdf');

const faqItems = [
    {
        question: 'How do I crop a PDF online?',
        answer: 'Upload your PDF, choose a margin preset or enter exact top, bottom, left, and right margins in points, then click "Crop PDF".'
    },
    {
        question: 'Does cropping reduce PDF file size?',
        answer: 'Cropping sets the visible CropBox boundary of the document. Content outside the crop box is hidden during viewing and printing.'
    },
    {
        question: 'Is my data secure?',
        answer: 'Yes! All cropping calculations are computed locally within your browser. No files are uploaded to our servers.'
    }
];

const benefits = [
    "Remove unwanted whitespace, scanner headers, or margins.",
    "Preset options (Small, Medium, Large) for quick 1-click cropping.",
    "Exact point adjustments for fine-grained margin control.",
    "100% private, free, and runs entirely in your browser."
];

export default function CropPdfPage() {
    return (
        <>
            <JsonLd data={toolSchema('/crop-pdf')} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Crop PDF', item: '/crop-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <CropPdfClient />

            <ToolSeoContent
                toolName="Crop PDF"
                actionName="Crop"
                actionDescription="crop and trim margins of your PDF files"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
