import React from 'react';
import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import { Mail } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Contact Us | MyOnlinePDF',
    description: 'Get in touch with the MyOnlinePDF team. We are here to help with any questions or feedback.',
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
                    Have questions, suggestions, or need support? We'd love to hear from you.
                </p>

                <div className="bg-white p-8 rounded-xl shadow-sm border text-center mb-8">
                    <Mail className="mx-auto mb-4 text-red-500" size={48} />
                    <h2 className="text-xl font-semibold mb-2">Email Support</h2>
                    <p className="text-gray-600 mb-4">For general inquiries and support requests.</p>
                    <a href="mailto:support@myonlinepdf.com" className="text-red-600 font-medium hover:underline text-lg">
                        support@myonlinepdf.com
                    </a>
                </div>

                <form className="bg-white p-8 rounded-xl shadow-sm border space-y-4">
                    <h2 className="text-xl font-semibold mb-4">Send a Message</h2>

                    <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <input type="text" className="w-full border rounded-md p-2" placeholder="Your Name" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input type="email" className="w-full border rounded-md p-2" placeholder="your@email.com" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Message</label>
                        <textarea className="w-full border rounded-md p-2 h-32" placeholder="How can we help?"></textarea>
                    </div>

                    <button type="submit" className="w-full bg-red-600 text-white py-3 rounded-md font-medium hover:bg-red-700 transition-colors">
                        Send Message
                    </button>
                    <p className="text-xs text-center text-muted mt-4">
                        This form currently uses your default mail client or is a demo.
                    </p>
                </form>
            </div>
        </div>
    );
}
