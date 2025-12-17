import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import UnlockPdfClient from './UnlockPdfClient';

export const metadata: Metadata = {
    title: 'Unlock PDF Online - Remove Password from PDF | MyOnlinePDF',
    description: 'Remove passwords and security restrictions from PDF files. Unlock your documents for editing and printing instantly.',
    alternates: {
        canonical: '/unlock-pdf',
    },
};

const faqItems = [
    {
        question: 'How do I remove a password from a PDF?',
        answer: 'Upload your encrypted PDF. If you know the password, enter it once to permanently remove it and create an unlocked copy.'
    },
    {
        question: 'Can you crack unknown passwords?',
        answer: 'No. For legal and security reasons, you must provide the correct password to unlock the file. This tool is for removing known passwords convenience.'
    }
];

const benefits = [
    "Remove annoying passwords from frequently used files.",
    "Enable editing and printing on restricted documents.",
    "Share unlocked copies with colleagues.",
    "Permanent removal of security settings."
];

export default function UnlockPdfPage() {
    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Unlock PDF', item: '/unlock-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <UnlockPdfClient />

            <ToolSeoContent
                toolName="Unlock PDF"
                actionName="Unlock"
                actionDescription="remove password from your PDF"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
