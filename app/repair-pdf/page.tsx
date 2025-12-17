import type { Metadata } from 'next';
import RepairClient from './RepairClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';

export const metadata: Metadata = {
    title: 'Repair PDF Online - Fix Corrupted PDF Files | MyOnlinePDF',
    description: 'Recover and repair damaged PDF files online. Fix corrupted documents for free. No software installation required.',
    alternates: {
        canonical: '/repair-pdf',
    },
};

const faqItems = [
    {
        question: 'How does the PDF repair tool work?',
        answer: 'We analyze the PDF file structure and rebuild the internal reference tables (XRef), often recovering content from unreadable files.'
    },
    {
        question: 'Can you fix all corrupted files?',
        answer: 'While we can fix many common structural errors, files with missing binary data or severe encryption damage may not be recoverable.'
    },
    {
        question: 'Is it free?',
        answer: 'Yes, the repair tool is completely free.'
    }
];

const benefits = [
    "Fix PDF files that won't open in your viewer.",
    "Recover data from damaged downloads.",
    "Rebuild corrupt XRef tables.",
    "Ensure file standards compliance."
];

export default function RepairPdfPage() {
    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Repair PDF', item: '/repair-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <RepairClient />

            <ToolSeoContent
                toolName="Repair PDF"
                actionName="Repair"
                actionDescription="fix your corrupted PDF"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
