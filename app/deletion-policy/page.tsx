import React from 'react';
import { seoMetadata } from '@/lib/seoOverrides';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';

export const generateMetadata = () => seoMetadata('/deletion-policy');

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
                        At PDFAdore, strict file security and deletion standards are our top priority. We understand that your documents are important and private.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">Client-Side Processing</h2>
                    <p className="mb-4">
                        All of our tools, including Protect PDF, Unlock PDF and the Office converters, operate entirely within your web browser.
                        This means <strong>your files are never uploaded to our servers</strong>. They interact only with your local device’s memory and are cleared as soon as you close the tab or refresh the page.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">No Data Retention</h2>
                    <p className="mb-4">
                        Because files are never uploaded, we have nothing to archive, store or back up. Processed results exist only as temporary in-memory links in your browser and are released when you start over, leave the page or close the tab.
                    </p>
                </div>
            </div>
        </div>
    );
}
