import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';
import PdfToExcelClient from './PdfToExcelClient';

export const metadata: Metadata = {
    title: 'PDF to Excel Converter - Convert PDF to XLS/XLSX | MyOnlinePDF',
    description: 'Convert PDF tables to editable Excel spreadsheets. Extract data accurately from your documents into XLS/XLSX format.',
    alternates: {
        canonical: '/pdf-to-excel',
    },
};

const faqItems = [
    {
        question: 'Can I convert scanned PDFs to Excel?',
        answer: 'Our tool works best with native PDFs. Scanned text may require OCR technology (coming soon).'
    },
    {
        question: 'Will the tables be preserved?',
        answer: 'Yes, we analyze the structure to place data into the correct rows and columns in Excel.'
    },
    {
        question: 'Is it secure?',
        answer: 'Your financial or data reports are processed securely and deleted automatically.'
    }
];

const benefits = [
    "Analyze data from PDF reports in Excel.",
    "Save hours of manual data entry.",
    "Accurate row and column recognition.",
    "Free for personal and business use."
];

export default function PdfToExcelPage() {
    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'PDF to Excel', item: '/pdf-to-excel' },
                ]}
            />
            <FaqSchema items={faqItems} />

            <PdfToExcelClient />

            <ToolSeoContent
                toolName="PDF to Excel"
                actionName="Convert"
                actionDescription="convert PDF to Excel"
                benefits={benefits}
                faqItems={faqItems}
            />
        </>
    );
}
