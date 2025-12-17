import type { Metadata } from 'next';
import ProtectClient from './ProtectClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';

export const metadata: Metadata = {
    title: 'Protect PDF Online - Encrypt PDF with Password | MyOnlinePDF',
    description: 'Secure your PDF files with a password. Protect sensitive documents online with strong encryption. Fast, secure, and free.',
    alternates: {
        canonical: '/protect-pdf',
    },
};

const faqItems = [
    {
        question: 'How do I password protect a PDF?',
        answer: 'Upload your file, enter a strong password in the text box, and click "Protect PDF". Your file will be encrypted instantly.'
    },
    {
        question: 'Is it secure?',
        answer: 'Yes. We use standard PDF encryption methods. While this tool runs on our secure server, your files are deleted immediately after processing. No inputs are stored.'
    },
    {
        question: 'Can I remove the password later?',
        answer: 'Yes, if you know the password, you can use our Unlock PDF tool (coming soon) or simply Print to PDF to remove protection.'
    },
    {
        question: 'Does this run in the browser?',
        answer: 'Unlike our other tools, encryption requires secure server-side processing to ensure compatibility. However, all data transmission is encrypted via HTTPS.'
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
