import Hero from '@/components/Hero';
import ToolCard from '@/components/ToolCard';
import {
  FileStack,
  Scissors,
  Minimize2,
  FileText,
  Image,
  FileSpreadsheet,
  Presentation,
  ArrowRightLeft,
  Lock,
  Unlock,
  RotateCw,
  FileCode,
  ShieldCheck,
  LayoutGrid,
  Stamp
} from 'lucide-react';
import styles from './page.module.css';

const tools = [
  {
    title: 'Merge PDF',
    description: 'Combine multiple PDFs into one unified document.',
    href: '/merge-pdf',
    icon: FileStack,
    color: '#e33636'
  },
  {
    title: 'Split PDF',
    description: 'Separate one page or a whole set for easy conversion into independent PDF files.',
    href: '/split-pdf',
    icon: Scissors,
    color: '#e33636'
  },
  {
    title: 'Compress PDF',
    description: 'Reduce file size while optimizing for maximal PDF quality.',
    href: '/compress-pdf',
    icon: Minimize2,
    color: '#e33636'
  },
  {
    title: 'PDF to Word',
    description: 'Easily convert your PDF files into easy to edit DOC and DOCX documents.',
    href: '/pdf-to-word',
    icon: FileText,
    color: '#2b579a'
  },
  {
    title: 'PDF to PowerPoint',
    description: 'Turn your PDF files into easy to edit PPT and PPTX slideshows.',
    href: '/pdf-to-powerpoint',
    icon: Presentation,
    color: '#d24726'
  },
  {
    title: 'PDF to Excel',
    description: 'Pull data straight from PDFs into Excel spreadsheets in a few short seconds.',
    href: '/pdf-to-excel',
    icon: FileSpreadsheet,
    color: '#217346'
  },
  {
    title: 'Word to PDF',
    description: 'Make DOC and DOCX files easy to read by converting them to PDF.',
    href: '/word-to-pdf',
    icon: FileText,
    color: '#2b579a'
  },
  {
    title: 'PowerPoint to PDF',
    description: 'Make PPT and PPTX slideshows easy to view by converting them to PDF.',
    href: '/powerpoint-to-pdf',
    icon: Presentation,
    color: '#d24726'
  },
  {
    title: 'Excel to PDF',
    description: 'Make EXCEL spreadsheets easy to read by converting them to PDF.',
    href: '/excel-to-pdf',
    icon: FileSpreadsheet,
    color: '#217346'
  },
  {
    title: 'PDF to JPG',
    description: 'Convert each PDF page into a JPG or extract all images contained in a PDF.',
    href: '/pdf-to-jpg',
    icon: Image,
    color: '#ffb300'
  },
  {
    title: 'JPG to PDF',
    description: 'Convert JPG images to PDF in seconds. Easily adjust orientation and margins.',
    href: '/jpg-to-pdf',
    icon: Image,
    color: '#ffb300'
  },
  {
    title: 'HTML to PDF',
    description: 'Convert web pages to PDF documents.',
    href: '/html-to-pdf',
    icon: FileCode,
    color: '#555555'
  },
  {
    title: 'Unlock PDF',
    description: 'Remove PDF password security, giving you the freedom to use your PDFs as you want.',
    href: '/unlock-pdf',
    icon: Unlock,
    color: '#7b1c1c'
  },
  {
    title: 'Protect PDF',
    description: 'Protect PDF files with a password. Encrypt PDF documents to prevent unauthorized access.',
    href: '/protect-pdf',
    icon: Lock,
    color: '#7b1c1c'
  },
  {
    title: 'Rotate PDF',
    description: 'Rotate your PDFs the way you need them. You can even rotate multiple PDFs at once!',
    href: '/rotate-pdf',
    icon: RotateCw,
    color: '#e33636'
  },
  {
    title: 'Organize PDF',
    description: 'Sort pages of your PDF file however you like. Delete PDF pages or add PDF pages to your document.',
    href: '/organize-pdf',
    icon: LayoutGrid,
    color: '#e33636'
  },
  {
    title: 'Repair PDF',
    description: 'Recover data from a corrupted or damaged PDF document.',
    href: '/repair-pdf',
    icon: ShieldCheck,
    color: '#e33636'
  },
  {
    title: 'Watermark PDF',
    description: 'Stamp an image or text over your PDF in seconds.',
    href: '/watermark-pdf',
    icon: Stamp,
    color: '#e33636'
  }
];

export default function Home() {
  return (
    <>
      <Hero />
      <section className={styles.toolsSection}>
        <div className="container">
          <div className={styles.grid}>
            {tools.map((tool) => (
              <ToolCard key={tool.href} {...tool} />
            ))}
          </div>
        </div>
      </section>

      {/* Content Section for SEO */}
      <section className={styles.seoSection}>
        <div className="container">
          <h2 className="text-center mb-4">The Best Online PDF Tools</h2>
          <p className="text-center" style={{ maxWidth: '800px', margin: '0 auto' }}>
            We offer a complete collection of PDF tools to help you work with your documents.
            All tools are free to use, without any need for registration or installation.
            Whether you need to merge, split, compress, or convert your files, we have a solution for you.
          </p>
        </div>
      </section>
    </>
  );
}
