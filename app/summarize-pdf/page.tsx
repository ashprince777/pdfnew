import type { Metadata } from 'next';
import AiPdfTool from '@/components/AiPdfTool';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import { pageMetadata, toolSchema } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = pageMetadata('/summarize-pdf');

const faqItems = [
    {
        question: 'How do I summarize a PDF?',
        answer: 'Upload your PDF, choose a detailed or short summary and the language, then click Summarize. The summary appears in seconds and can be copied or downloaded as Word.',
    },
    {
        question: 'Which AI is used?',
        answer: 'Summaries are written by a large language model run by Groq, an AI inference service. Only the text of the pages you choose is sent to it; the file itself stays on your device.',
    },
    {
        question: 'Is it free?',
        answer: 'Free accounts get 3 AI credits every month. Premium includes 200 AI credits a month.',
    },
    {
        question: 'Can it summarize scanned PDFs?',
        answer: 'Scanned pages have no text layer. Run OCR in Edit PDF first, then summarize.',
    },
];

const benefits = [
    'Overview, key points, dates, amounts and action items.',
    'Summaries in the language of your choice.',
    'Choose specific pages of long documents.',
    'Copy the summary or download it as Word.',
];

export default function SummarizePdfPage() {
    return (
        <>
            <JsonLd data={toolSchema('/summarize-pdf')} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Summarize PDF', item: '/summarize-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <AiPdfTool task="summarize" />

            <ToolSeoContent
                toolName="Summarize PDF"
                actionName="Summarize"
                actionDescription="summarize PDF documents with AI"
                benefits={benefits}
                faqItems={faqItems}
                ai
            />
        </>
    );
}
