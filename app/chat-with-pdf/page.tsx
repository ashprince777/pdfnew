import type { Metadata } from 'next';
import AiPdfTool from '@/components/AiPdfTool';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';

export const metadata: Metadata = {
    title: 'Chat with PDF - Ask Questions About Any PDF with AI',
    description: 'Ask questions about your PDF and get answers with page references. Understand contracts, reports, research papers and bills faster.',
    alternates: {
        canonical: '/chat-with-pdf',
    },
};

const faqItems = [
    {
        question: 'How does Chat with PDF work?',
        answer: 'Upload a PDF and type a question. The AI reads the text of the document and answers using only what it says, with the page numbers it found the answer on.',
    },
    {
        question: 'Does each question cost a credit?',
        answer: 'Yes, each question uses 1 AI credit. Free accounts get 3 credits a month; Premium gets 200.',
    },
    {
        question: 'Is my document stored?',
        answer: 'No. Only the extracted text is sent to the AI model (run by Groq) to answer; we do not store it or your chat.',
    },
    {
        question: 'Can I trust the answers?',
        answer: 'Answers cite pages so you can check them. AI can make mistakes, so verify important facts in the document.',
    },
];

const benefits = [
    'Answers with page references.',
    'Works with contracts, invoices, reports and research papers.',
    'Ask follow-up questions in the same chat.',
    'Your PDF file never leaves your device; only its text is sent to the AI.',
];

export default function ChatWithPdfPage() {
    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Chat with PDF', item: '/chat-with-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <AiPdfTool task="chat" />

            <ToolSeoContent
                toolName="Chat with PDF"
                actionName="Chat with"
                actionDescription="ask questions about PDF documents with AI"
                benefits={benefits}
                faqItems={faqItems}
                ai
            />
        </>
    );
}
