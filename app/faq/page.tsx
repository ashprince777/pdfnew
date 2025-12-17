import React from 'react';
import type { Metadata } from 'next';
import FaqSchema from '@/components/FaqSchema';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import Accordion from '@/components/Accordion';

export const metadata: Metadata = {
    title: 'FAQ - Common Questions | MyOnlinePDF',
    description: 'Frequently asked questions about MyOnlinePDF. Learn about our free PDF tools, security, privacy, and how to use our services.',
    alternates: {
        canonical: '/faq',
    },
};

const faqItems = [
    {
        question: 'Is MyOnlinePDF free to use?',
        answer: 'Yes! MyOnlinePDF is completely free to use. You do not need to register, sign up, or pay for any subscription to access our core PDF tools.',
    },
    {
        question: 'Are my files stored on your servers?',
        answer: 'No. For most tools (Merge, Split, Compress, etc.), we process your files entirely within your web browser using advanced client-side technology. Your files never leave your device. For tools requiring server-side processing (like Protect PDF), files are deleted immediately after processing.',
    },
    {
        question: 'Is it safe to use MyOnlinePDF?',
        answer: 'Absolutely. We prioritize your privacy and security. Since most processing happens locally on your device, there is minimal risk of data interception. We use SSL encryption (HTTPS) for all connections.',
    },
    {
        question: 'Why are some tools marked as "Server Processing"?',
        answer: 'Some complex operations, like encryption or converting proprietary formats, require server-side libraries to function correctly across all devices. We handle these securely and ensure strict data deletion policies.',
    },
    {
        question: 'How many files can I process at once?',
        answer: 'There is no strict limit on the number of files, but performance depends on your device capabilities since processing happens in your browser.',
    },
];

export default function FaqPage() {
    return (
        <div className="container py-12">
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'FAQ', item: '/faq' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
                <p className="text-muted mb-8">Answers to common questions about our PDF tools.</p>

                <div className="mt-8">
                    <Accordion items={faqItems} />
                </div>
            </div>
        </div>
    );
}
