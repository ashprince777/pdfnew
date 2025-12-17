import React from 'react';
import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';

export const metadata: Metadata = {
    title: 'File Deletion Policy | MyOnlinePDF',
    description: 'Learn how MyOnlinePDF handles your files. We prioritize your privacy with strict file deletion policies.',
    alternates: {
        canonical: '/deletion-policy',
    },
};

export default function DeletionPolicyPage() {
    return (
        <div className="container py-12">
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'File Deletion Policy', item: '/deletion-policy' },
                ]}
            />

            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">File Deletion Policy</h1>

                <div className="prose">
                    <p className="mb-4">
                        At MyOnlinePDF, strict file security and deletion standards are our top priority. We understand that your documents are important and private.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">Client-Side Processing</h2>
                    <p className="mb-4">
                        Most of our tools (Merge, Split, Compress, Organize, Rotate, JPG to PDF) operate entirely within your web browser.
                        This means <strong>your files are never uploaded to our servers</strong>. They interact only with your local device's memory and are cleared as soon as you close the tab or refresh the page.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">Server-Side Processing</h2>
                    <p className="mb-4">
                        For specific tools that require server-side processing (such as 'Protect PDF'), files are temporarily uploaded to a secure processing server.
                        These files are:
                        <ul className="list-disc ml-6 mt-2">
                            <li>Transmitted over a secure SSL (HTTPS) connection.</li>
                            <li>Processed immediately by our automated systems.</li>
                            <li>Used ONLY for the purpose of the requested conversion/modification.</li>
                            <li><strong>Permanently deleted</strong> immediately after the processed file is generated and sent back to you.</li>
                        </ul>
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">No Data Retention</h2>
                    <p className="mb-4">
                        We do not archive, store, or backup any user-uploaded files. Once the process is complete, the data is wiped. We do not look at, read, or share your documents.
                    </p>
                </div>
            </div>
        </div>
    );
}
