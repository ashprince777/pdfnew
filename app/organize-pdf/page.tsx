import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import OrganizePdfClient from './OrganizePdfClient';

export const metadata: Metadata = {
    title: 'Organize PDF Online - Sort, Delete & Move Pages | MyOnlinePDF',
    description: 'Organize PDF pages online. Reorder, move, or delete pages from your PDF document. Drag and drop interface.',
    alternates: {
        canonical: '/organize-pdf',
    },
};

const faqItems = [
    {
        question: 'How do I organize PDF pages?',
        answer: 'Upload your file. You will see a grid of all pages. Drag and drop pages to reorder them, or click the trash icon to delete unwanted pages.'
    },
    {
        question: 'Can I combine multiple files here?',
        answer: 'This tool is detailed page organization for a single file. To combine files, use our Merge PDF tool first.'
    }
];

const benefits = [
    "Reorder pages that are out of sequence.",
    "Delete blank or unwanted pages.",
    "Prepare professional documents for presentation.",
    "Visual drag-and-drop editor."
];

export default function OrganizePdfPage() {
    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Organize PDF', item: '/organize-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <div className="container py-12 text-center">
                <h1 className="text-4xl font-bold mb-4">Organize PDF</h1>
                <p className="text-muted mb-8 text-lg">Sort, reorder, and delete pages from your PDF.</p>

                <OrganizePdfClient />
            </div>

            <ToolSeoContent
                toolName="Organize PDF"
                actionName="Organize"
                actionDescription="reorder pages in your PDF"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
