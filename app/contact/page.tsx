import React from 'react';
import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import { Mail } from 'lucide-react';
import ContactForm from '@/components/ContactForm';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
    title: 'Contact Us',
    description: 'Get in touch with the PDFAdore team. We are here to help with any questions or feedback.',
    alternates: {
        canonical: '/contact',
    },
};

export default function ContactPage() {
    return (
        <div className="container py-12">
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Contact', item: '/contact' },
                ]}
            />

            <div className="max-w-xl mx-auto">
                <h1 className="text-3xl font-bold mb-6 text-center">Contact Us</h1>
                <p className="text-center text-muted mb-8">
                    Have questions, suggestions, or need support? We’d love to hear from you.
                </p>

                <div className="bg-white p-8 rounded-xl shadow-sm border text-center mb-8">
                    <Mail className="mx-auto mb-4 text-red-500" size={48} />
                    <h2 className="text-xl font-semibold mb-2">Email Support</h2>
                    <p className="text-gray-600 mb-4">For general inquiries and support requests.</p>
                    <a href={`mailto:${SITE.supportEmail}`} className="text-red-600 font-medium hover:underline text-lg">
                        {SITE.supportEmail}
                    </a>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-sm border">
                    <h2 className="text-xl font-semibold mb-4">Send a Message</h2>
                    <ContactForm supportEmail={SITE.supportEmail} />
                </div>

                <p className="text-sm text-muted text-center mt-8">
                    {SITE.legalName}, {SITE.address}
                </p>
            </div>
        </div>
    );
}
