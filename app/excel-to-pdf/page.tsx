import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import ExcelToPdfClient from './ExcelToPdfClient';

export const metadata: Metadata = {
    title: 'Excel to PDF Converter - Convert XLS to PDF Online | MyOnlinePDF',
    description: 'Convert Excel spreadsheets (XLS, XLSX) to PDF format online. Create easy-to-read reports from your data.',
    alternates: {
        canonical: '/excel-to-pdf',
    },
};

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
