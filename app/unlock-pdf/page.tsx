import { seoMetadata } from '@/lib/seoOverrides';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import UnlockPdfClient from './UnlockPdfClient';
import { toolSchema } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const generateMetadata = () => seoMetadata('/unlock-pdf');

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
            <JsonLd data={toolSchema('/unlock-pdf')} />
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
