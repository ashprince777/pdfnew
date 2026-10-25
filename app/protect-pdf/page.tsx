import type { Metadata } from 'next';
import ProtectClient from './ProtectClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import { pageMetadata, toolSchema } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = pageMetadata('/protect-pdf');

const faqItems = [
    {
        question: 'How do I password protect a PDF?',
        answer: 'Upload your file, enter a strong password in the text box, and click "Protect PDF". Your file will be encrypted instantly.'
    },
    {
        question: 'Is it secure?',
        answer: 'Yes. Your PDF is encrypted with AES-256, the strongest standard PDF encryption, directly in your browser. The file and the password never leave your device.'
    },
    {
        question: 'Can I remove the password later?',
        answer: 'Yes. If you know the password, use our Unlock PDF tool to remove it while keeping the text, links and bookmarks intact.'
    },
    {
        question: 'Does this run in the browser?',
        answer: 'Yes. Like every PDFAdore tool, encryption runs entirely in your browser. Nothing is uploaded to a server.'
    }
];

const benefits = [
    "Prevent unauthorized access to sensitive documents.",
    "Comply with data protection regulations for personal data.",
    "Securely share financial or legal documents via email.",
    "Add an extra layer of security to your archives."
];

export default function ProtectPdfPage() {
    return (
        <>
            <JsonLd data={toolSchema('/protect-pdf')} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Protect PDF', item: '/protect-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <ProtectClient />

            <ToolSeoContent
                toolName="Protect PDF"
                actionName="Protect"
                actionDescription="encrypt your PDF with a password"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
