import { seoMetadata } from '@/lib/seoOverrides';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import JsonLd from '@/components/JsonLd';
import { toolSchema } from '@/lib/seo';
import JpgToPdfClient from '../jpg-to-pdf/JpgToPdfClient';

export const generateMetadata = () => seoMetadata('/webp-to-pdf');

const faqItems = [
    {
        question: "What is a WebP file?",
        answer: "WebP is an image format many websites and some messaging apps use because the files are small. Some forms and older apps cannot open it, so converting to PDF makes the image easy to share and upload.",
    },
    {
        question: "How do I convert WebP to PDF?",
        answer: "Select one or more .webp files, set the order, page size and margin, then click \"Convert\" to download a PDF.",
    },
    {
        question: "Can I combine several WebP images?",
        answer: "Yes. Every image becomes a page in the same PDF, in the order you set. You can also mix in JPG and PNG files.",
    },
    {
        question: "Are my images uploaded?",
        answer: "No. Conversion happens in your browser and your images never leave your device.",
    },
];

const benefits = [
    "Save product images or articles downloaded as WebP in a format anyone can open.",
    "Upload WebP images to a portal that only accepts PDF.",
    "Collect WebP images received in chats into one document.",
    "Print WebP images neatly on A4 or Letter pages.",
];

export default function WebpToPdfPage() {
    return (
        <>
            <JsonLd data={toolSchema('/webp-to-pdf', { name: 'WebP to PDF' })} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'JPG to PDF', item: '/jpg-to-pdf' },
                    { name: 'WebP to PDF', item: '/webp-to-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <JpgToPdfClient title="WebP to PDF" subtitle="Convert WebP images from websites and chats into a single PDF." />

            <ToolSeoContent
                toolName="WebP to PDF"
                actionName="Convert"
                actionDescription="convert WebP images to PDF"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
