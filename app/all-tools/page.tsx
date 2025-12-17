"use client";
import ToolCard from '@/components/ToolCard';
import {
    FileStack, Scissors, Minimize2, FileText, Image, FileSpreadsheet,
    Presentation, Lock, Unlock, RotateCw, FileCode, LayoutGrid, ShieldCheck, Stamp
} from 'lucide-react';
import styles from '../page.module.css'; // Reuse homepage styles

const tools = [
    { title: 'Merge PDF', description: 'Combine multiple PDFs into one unified document.', href: '/merge-pdf', icon: FileStack, color: '#e33636' },
    { title: 'Split PDF', description: 'Separate one page or a whole set for easy conversion.', href: '/split-pdf', icon: Scissors, color: '#e33636' },
    { title: 'Compress PDF', description: 'Reduce file size while optimizing for maximal PDF quality.', href: '/compress-pdf', icon: Minimize2, color: '#e33636' },
    { title: 'PDF to Word', description: 'Easily convert your PDF files into easy to edit DOC and DOCX documents.', href: '/pdf-to-word', icon: FileText, color: '#2b579a' },
    { title: 'PDF to PowerPoint', description: 'Turn your PDF files into easy to edit PPT and PPTX slideshows.', href: '/pdf-to-powerpoint', icon: Presentation, color: '#d24726' },
    { title: 'PDF to Excel', description: 'Pull data straight from PDFs into Excel spreadsheets.', href: '/pdf-to-excel', icon: FileSpreadsheet, color: '#217346' },
    { title: 'Word to PDF', description: 'Make DOC and DOCX files easy to read by converting them to PDF.', href: '/word-to-pdf', icon: FileText, color: '#2b579a' },
    { title: 'PowerPoint to PDF', description: 'Make PPT and PPTX slideshows easy to view by converting them to PDF.', href: '/powerpoint-to-pdf', icon: Presentation, color: '#d24726' },
    { title: 'Excel to PDF', description: 'Make EXCEL spreadsheets easy to read by converting them to PDF.', href: '/excel-to-pdf', icon: FileSpreadsheet, color: '#217346' },
    { title: 'PDF to JPG', description: 'Convert each PDF page into a JPG or extract all images.', href: '/pdf-to-jpg', icon: Image, color: '#ffb300' },
    { title: 'JPG to PDF', description: 'Convert JPG images to PDF in seconds.', href: '/jpg-to-pdf', icon: Image, color: '#ffb300' },
    { title: 'HTML to PDF', description: 'Convert web pages to PDF documents.', href: '/html-to-pdf', icon: FileCode, color: '#555555' },
    { title: 'Unlock PDF', description: 'Remove PDF password security.', href: '/unlock-pdf', icon: Unlock, color: '#7b1c1c' },
    { title: 'Protect PDF', description: 'Protect PDF files with a password.', href: '/protect-pdf', icon: Lock, color: '#7b1c1c' },
    { title: 'Rotate PDF', description: 'Rotate your PDFs the way you need them.', href: '/rotate-pdf', icon: RotateCw, color: '#e33636' },
    { title: 'Organize PDF', description: 'Sort pages of your PDF file however you like.', href: '/organize-pdf', icon: LayoutGrid, color: '#e33636' },
    { title: 'Repair PDF', description: 'Recover data from a corrupted or damaged PDF document.', href: '/repair-pdf', icon: ShieldCheck, color: '#e33636' },
    { title: 'Watermark PDF', description: 'Stamp an image or text over your PDF in seconds.', href: '/watermark-pdf', icon: Stamp, color: '#e33636' },
];

export default function AllToolsPage() {
    return (
        <div className="container" style={{ padding: '60px 20px' }}>
            <div className="text-center mb-5">
                <h1>All PDF Tools</h1>
                <p className="text-muted">Make use of our collection of PDF tools to process your digital documents.</p>
            </div>
            <div className={styles.grid}>
                {tools.map((tool) => (
                    <ToolCard key={tool.href} {...tool} />
                ))}
            </div>
        </div>
    );
}
