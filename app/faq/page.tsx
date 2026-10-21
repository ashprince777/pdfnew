import React from 'react';
import type { Metadata } from 'next';
import FaqSchema from '@/components/FaqSchema';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import Accordion from '@/components/Accordion';

export const metadata: Metadata = {
    title: 'FAQ - Common Questions',
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
        answer: 'No. Every tool processes your files entirely within your web browser. Your files are never uploaded, so there is nothing for us to store.',
    },
    {
        question: 'Is it safe to use MyOnlinePDF?',
        answer: 'Yes. Because all processing happens locally on your device, your documents are never transmitted over the network. The site itself is served over HTTPS.',
    },
    {
        question: 'Do any tools need an internet connection while processing?',
        answer: 'No. Once a tool page has loaded, the processing itself happens offline in your browser. Encryption, conversion and editing all run on your device.',
    },
    {
        question: 'How many files can I process at once?',
        answer: 'There is no strict limit on the number of files. Because processing happens in your browser, very large files (hundreds of pages) depend on your device memory; tools show the size limit they support.',
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
