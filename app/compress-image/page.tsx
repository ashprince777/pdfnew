import { seoMetadata } from '@/lib/seoOverrides';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import JsonLd from '@/components/JsonLd';
import { toolSchema } from '@/lib/seo';
import CompressImageClient from './CompressImageClient';

export const generateMetadata = () => seoMetadata('/compress-image');

const faqItems = [
    {
        question: 'How do I compress an image to a size in KB?',
        answer: 'Select your photo, type the maximum size in KB (or tap a preset such as 20 KB or 50 KB) and click "Compress image". You get a JPG that is under the limit, at the highest quality that fits.',
    },
    {
        question: 'Can I set the photo size in pixels for a form?',
        answer: 'Yes. Type the width and height in pixels that the form asks for. The photo is resized to exactly that size and compressed under your KB limit. If the shape is different, the edges are trimmed evenly.',
    },
    {
        question: 'Which image types can I use?',
        answer: 'JPG, PNG and WebP. The result is always a JPG, which is what most application forms accept. Transparent areas become white.',
    },
    {
        question: 'Is my photo uploaded?',
        answer: 'No. The image is compressed inside your browser and never leaves your device.',
    },
];

const benefits = [
    'Fit a passport-size photo or signature under the limit on an exam or job form.',
    'Shrink a phone photo of a certificate or ID before uploading it.',
    'Send pictures faster on slow mobile data or by email.',
    'Meet a pixel size and a KB limit at the same time.',
];

export default function CompressImagePage() {
    return (
        <>
            <JsonLd data={toolSchema('/compress-image')} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Compress Image', item: '/compress-image' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <CompressImageClient />

            <ToolSeoContent toolName="Compress Image" actionName="Compress" subject="Images" actionDescription="reduce a photo to a size in KB" benefits={benefits} faqItems={faqItems} />
        </>
    );
}
