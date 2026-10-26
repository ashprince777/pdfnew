import React from 'react';
import { seoMetadata } from '@/lib/seoOverrides';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import { Mail } from 'lucide-react';
import ContactForm from '@/components/ContactForm';
import { SITE } from '@/lib/site';

export const generateMetadata = () => seoMetadata('/contact');

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
                    <Mail className="mx-auto mb-4" size={48} style={{ color: 'var(--primary)' }} />
                    <h2 className="text-xl font-semibold mb-2">Email Support</h2>
                    <p className="text-gray-600 mb-4">For general inquiries and support requests.</p>
                    <a href={`mailto:${SITE.supportEmail}`} className="font-medium hover:underline text-lg" style={{ color: 'var(--primary)' }}>
                        {SITE.supportEmail}
                    </a>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-sm border">
                    <h2 className="text-xl font-semibold mb-4">Send a Message</h2>
                    <ContactForm supportEmail={SITE.supportEmail} />
                </div>

                <div className="bg-white p-8 rounded-xl shadow-sm border mt-8">
                    <h2 className="text-xl font-semibold mb-4">Business details</h2>
                    <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 16px', fontSize: '0.95rem' }}>
                        <dt className="text-muted">Operated by</dt>
                        <dd>{SITE.legalName}</dd>
                        <dt className="text-muted">Address</dt>
                        <dd>{SITE.address}</dd>
                        <dt className="text-muted">Phone</dt>
                        <dd>
                            <a href={`tel:${SITE.phone.replace(/\s+/g, '')}`} className="hover:underline" style={{ color: 'var(--primary)' }}>{SITE.phone}</a>
                        </dd>
                        <dt className="text-muted">Email</dt>
                        <dd>
                            <a href={`mailto:${SITE.supportEmail}`} className="hover:underline" style={{ color: 'var(--primary)' }}>{SITE.supportEmail}</a>
                        </dd>
                        <dt className="text-muted">Grievance officer</dt>
                        <dd>Grievance Officer, {SITE.legalName} ({SITE.supportEmail})</dd>
                        <dt className="text-muted">Support hours</dt>
                        <dd>Monday to Saturday, 10:00 to 18:00 IST. We reply to emails within 1 working day.</dd>
                    </dl>
                </div>
            </div>
        </div>
    );
}
