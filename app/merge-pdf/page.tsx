import type { Metadata } from 'next';
import MergeClient from './MergeClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import styles from './page.module.css';

export const metadata: Metadata = {
    title: 'Merge PDF Online - Combine PDF Files for Free | MyOnlinePDF',
    description: 'Merge multiple PDF files into one document online. Fast, secure, and completely free. No software installation required.',
    alternates: {
        canonical: '/merge-pdf',
    },
};

const faqItems = [
    {
        question: 'How do I merge PDF files?',
        answer: 'Select your PDF files, arrange them in the desired order, and click "Merge PDF". Your combined file will be ready instantly.'
    },
    {
        question: 'Is it safe to merge PDF files online?',
        answer: 'Yes, absolutely. MyOnlinePDF processes your files directly in your web browser. They are not uploaded to our servers, ensuring complete privacy.'
    },
    {
        question: 'Is this PDF merger free?',
        answer: 'Yes, our PDF merging tool is 100% free with no limits on the number of files or daily usage.'
    },
    {
        question: 'Can I reorder pages before merging?',
        answer: 'Currently, you can add files in order. For detailed page reordering, use our "Organize PDF" tool first.'
    },
    {
        question: 'Does quality decrease after merging?',
        answer: 'No, we preserve the original quality of your PDF documents during the merging process.'
    }
];

export default function MergePdfPage() {
    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Merge PDF', item: '/merge-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <MergeClient />

            {/* Expanded SEO Content */}
            <div className={`container ${styles.seoContent}`}>
                <div className="prose max-w-4xl mx-auto py-12">
                    <h2 className="text-3xl font-bold mb-6">The Best Free Online PDF Merger</h2>
                    <p className="text-lg text-gray-700 mb-6">
                        Looking for a simple way to combine multiple PDF files into one? MyOnlinePDF offers a fast, reliable, and secure solution.
                        Whether you need to merge invoices for accounting, combine chapters for a thesis, or collate diverse documents into a single report,
                        our tool makes it effortless.
                    </p>

                    <h2 className="text-2xl font-semibold mb-4 text-gray-800">When Should You Use This Tool?</h2>
                    <p className="mb-4">
                        Merging PDFs is essential in many professional and personal scenarios:
                    </p>
                    <ul className="list-disc pl-6 mb-8 text-gray-700 space-y-2">
                        <li><strong>Business Reports:</strong> Combine financial statements, charts, and analysis into one professional packet.</li>
                        <li><strong>Student Projects:</strong> Merge essay sections, cover pages, and bibliographies into a single submission file.</li>
                        <li><strong>Legal Documents:</strong> Collate contracts, appendices, and evidence scans.</li>
                        <li><strong>Archives:</strong> Reduce file clutter by grouping related documents together.</li>
                    </ul>

                    <h2 className="text-2xl font-semibold mb-4 text-gray-800">Why Choose MyOnlinePDF?</h2>
                    <div className="grid md:grid-cols-2 gap-6 mb-10">
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <h3 className="text-xl font-bold mb-2">100% Secure & Private</h3>
                            <p>We process your files <strong>locally in your browser</strong>. Unlike other tools, your sensitive documents are never uploaded to a remote server. You retain full control.</p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <h3 className="text-xl font-bold mb-2">Lightning Fast</h3>
                            <p>Because there is no upload needed, processing is instant. Even large files merge in seconds, limited only by your device speed.</p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <h3 className="text-xl font-bold mb-2">Completely Free</h3>
                            <p>No hidden costs, no watermarks, and no registration required. Use it as many times as you like.</p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <h3 className="text-xl font-bold mb-2">Cross-Platform</h3>
                            <p>Works perfectly on Windows, Mac, Linux, and even mobile devices. All you need is a modern web browser.</p>
                        </div>
                    </div>

                    <h2 className="text-2xl font-semibold mb-4 text-gray-800">How to Merge PDFs Step-by-Step</h2>
                    <ol className="list-decimal pl-6 mb-8 text-gray-700 space-y-3">
                        <li>Click the <strong>"Select PDF files"</strong> button or drag and drop your files into the upload area.</li>
                        <li>Select two or more PDF documents you wish to combine.</li>
                        <li>Review the file list. You can add more files or remove ones you don't need.</li>
                        <li>Click the <strong>"Merge PDF"</strong> button.</li>
                        <li>Wait a moment for the process to complete, then download your merged file instantly.</li>
                    </ol>

                    <h2 className="text-2xl font-semibold mb-6 text-gray-800">Common Problems Solved</h2>
                    <p className="mb-6 text-gray-700">
                        <strong>"I have too many email attachments."</strong><br />
                        Instead of sending 5 separate PDF attachments, merge them into one organized file. It's more professional and easier for the recipient to view.
                    </p>
                    <p className="mb-8 text-gray-700">
                        <strong>"My scanner created separate files for each page."</strong><br />
                        It's annoying when scanners output page1.pdf, page2.pdf, etc. Use our tool to stitch them back into a single, cohesive document.
                    </p>

                    <h2 className="text-2xl font-semibold mb-6 text-gray-800">Related Tools</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <a href="/split-pdf" className="block p-4 border rounded hover:border-red-500 hover:text-red-600 transition-colors text-center font-medium">
                            Split PDF &rarr;
                        </a>
                        <a href="/compress-pdf" className="block p-4 border rounded hover:border-red-500 hover:text-red-600 transition-colors text-center font-medium">
                            Compress PDF &rarr;
                        </a>
                        <a href="/organize-pdf" className="block p-4 border rounded hover:border-red-500 hover:text-red-600 transition-colors text-center font-medium">
                            Organize Pages &rarr;
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}
