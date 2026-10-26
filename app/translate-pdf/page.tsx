import { seoMetadata } from '@/lib/seoOverrides';
import AiPdfTool from '@/components/AiPdfTool';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import { toolSchema } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const generateMetadata = () => seoMetadata('/translate-pdf');

const faqItems = [
    {
        question: 'Which languages are supported?',
        answer: 'English, Hindi, Bengali, Marathi, Tamil, Telugu, Gujarati, Kannada, Malayalam, Punjabi, Urdu, Odia and 10 international languages including Spanish, French, German, Arabic, Chinese and Japanese.',
    },
    {
        question: 'Does it keep the layout?',
        answer: 'The translation keeps the page order, paragraphs and lists, and is delivered as text or a Word document. The original layout and images are not recreated.',
    },
    {
        question: 'How long can the document be?',
        answer: 'A few pages of text per request. For longer documents, translate a range of pages at a time (for example 1-2, then 3-4).',
    },
    {
        question: 'How many translations can I do?',
        answer: 'Each translation uses 1 AI credit. Free accounts get 3 credits a month; Premium gets 200.',
    },
];

const benefits = [
    'Natural-sounding AI translations.',
    'Indian and international languages.',
    'Translate the whole document or chosen pages.',
    'Download as Word to edit or share.',
];

export default function TranslatePdfPage() {
    return (
        <>
            <JsonLd data={toolSchema('/translate-pdf')} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Translate PDF', item: '/translate-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <AiPdfTool task="translate" />

            <ToolSeoContent
                toolName="Translate PDF"
                actionName="Translate"
                actionDescription="translate PDF documents with AI"
                benefits={benefits}
                faqItems={faqItems}
                ai
            />
        </>
    );
}
