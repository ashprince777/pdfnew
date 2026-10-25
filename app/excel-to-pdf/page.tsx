import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import ExcelToPdfClient from './ExcelToPdfClient';
import { pageMetadata, toolSchema } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = pageMetadata('/excel-to-pdf');

const faqItems = [
    {
        question: 'How do I convert Excel to PDF?',
        answer: 'Simply upload your Excel workbook. We convert each sheet into a page in the PDF document.'
    },
    {
        question: 'Does it support formulas?',
        answer: 'The conversion takes a snapshot of the current values in your sheet, just like printing. Formulas are not preserved in the PDF output.'
    }
];

const benefits = [
    "Share spreadsheets without worrying about broken formulas.",
    "Create clean, printable reports.",
    "Prevent unwanted editing of your data.",
    "Work with both .xls and .xlsx formats."
];

export default function ExcelToPdfPage() {
    return (
        <>
            <JsonLd data={toolSchema('/excel-to-pdf')} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Excel to PDF', item: '/excel-to-pdf' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <ExcelToPdfClient />

            <ToolSeoContent
                toolName="Excel to PDF"
                actionName="Convert"
                actionDescription="convert Excel to PDF"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
