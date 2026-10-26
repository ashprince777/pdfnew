import { seoMetadata } from '@/lib/seoOverrides';
import EditPdfClient from './EditPdfClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import { toolSchema } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const generateMetadata = () => seoMetadata('/edit-pdf');

const faqItems = [
    {
        question: 'How do I edit a PDF online?',
        answer: 'Upload your PDF, choose "Add Text" or "Add Highlight", customize font size and color, click anywhere on the page to place it, then click "Save & Download PDF".'
    },
    {
        question: 'Can I edit multiple pages in the same PDF?',
        answer: 'Yes! Use the page navigation buttons (Prev / Next) to navigate between pages and place annotations on any page.'
    },
    {
        question: 'Is it completely private?',
        answer: 'Yes, your files and edits are processed 100% locally in your browser. No document data is ever transmitted to external servers.'
    }
];

const benefits = [
    "Add notes, comments, and missing details to forms and documents.",
    "Highlight important clauses, deadlines, or numbers easily.",
    "Customizable typography, text size, and color picker.",
    "Completely free, fast, and secure in your browser."
];

export default function EditPdfPage() {
    return (
        <>
            <JsonLd data={toolSchema('/edit-pdf')} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Edit PDF', item: '/edit-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <EditPdfClient />

            <ToolSeoContent
                toolName="Edit PDF"
                actionName="Edit"
                actionDescription="edit, add text, and annotate PDF documents"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
