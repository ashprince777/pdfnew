import type { Metadata } from 'next';
import FillFormClient from './FillFormClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import { pageMetadata, toolSchema } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = pageMetadata('/fill-pdf-form');

const faqItems = [
    {
        question: 'How do I fill a PDF form online?',
        answer: 'Upload a fillable PDF. Every field is listed by page so you can type your answers, tick checkboxes and choose options, then click "Fill PDF form".',
    },
    {
        question: 'What does flattening a form mean?',
        answer: 'Flattening turns the answers into ordinary page content. The form looks the same but can no longer be edited, which is useful before sending it.',
    },
    {
        question: 'My PDF has no fields. What can I do?',
        answer: 'Use the Edit PDF tool to add text anywhere on the page.',
    },
    {
        question: 'Can I type in Hindi or use the ₹ sign?',
        answer: "Yes. When your answers contain characters the form's built-in font cannot show, a Unicode font is embedded automatically.",
    },
];

const benefits = [
    'Supports text fields, checkboxes, radio buttons, dropdowns and lists.',
    'Optional flattening locks your answers in place.',
    'Unicode answers (₹, Hindi, Greek and more) display correctly.',
    'Runs in your browser: your answers are never uploaded.',
];

export default function FillPdfFormPage() {
    return (
        <>
            <JsonLd data={toolSchema('/fill-pdf-form')} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Fill PDF Forms', item: '/fill-pdf-form' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <FillFormClient />

            <ToolSeoContent
                toolName="Fill PDF Forms"
                actionName="Fill"
                actionDescription="fill in fillable PDF forms"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
