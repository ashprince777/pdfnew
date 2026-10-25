import {
    FileStack,
    Scissors,
    Trash2,
    LayoutGrid,
    Minimize2,
    ShieldCheck,
    Image,
    FileText,
    Presentation,
    FileSpreadsheet,
    FileCode,
    RotateCw,
    Hash,
    Stamp,
    Unlock,
    Lock,
    PenTool,
    Crop,
    FileEdit,
    ArrowLeftRight,
    Archive,
    Sparkles,
    MessagesSquare,
    Languages,
    EyeOff,
    FormInput,
    ScanLine,
    Type,
    LucideIcon
} from 'lucide-react';

export type ToolCategory =
    | 'all'
    | 'organize'
    | 'optimize'
    | 'to_pdf'
    | 'from_pdf'
    | 'edit'
    | 'security'
    | 'ai';

export interface ToolItem {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    color: string;
    category: ToolCategory;
    /** Shown on the tool card so people know before uploading: Premium-only, or needs a free account. */
    access?: 'premium' | 'account';
}

export const CATEGORIES: { id: ToolCategory; label: string; color: string }[] = [
    { id: 'all', label: 'All Tools', color: 'var(--accent)' },
    { id: 'organize', label: 'Organize PDF', color: 'var(--cat-organize)' },
    { id: 'optimize', label: 'Optimize PDF', color: 'var(--cat-optimize)' },
    { id: 'to_pdf', label: 'Convert to PDF', color: 'var(--cat-to-pdf)' },
    { id: 'from_pdf', label: 'Convert from PDF', color: 'var(--cat-from-pdf)' },
    { id: 'edit', label: 'Edit PDF', color: 'var(--cat-edit)' },
    { id: 'security', label: 'PDF Security', color: 'var(--cat-security)' },
    { id: 'ai', label: 'AI PDF', color: 'var(--cat-ai)' },
];

export const POPULAR_TOOL_HREFS: string[] = [
    '/merge-pdf',
    '/compress-pdf',
    '/pdf-to-word',
    '/protect-pdf',
    '/sign-pdf',
];

export const ALL_TOOLS: ToolItem[] = [
    // Organize (Rose/Crimson)
    {
        title: 'Merge PDF',
        description: 'Combine multiple PDFs into one document in your exact order.',
        href: '/merge-pdf',
        icon: FileStack,
        color: 'var(--cat-organize)',
        category: 'organize',
    },
    {
        title: 'Split PDF',
        description: 'Extract specific pages or split document into standalone files.',
        href: '/split-pdf',
        icon: Scissors,
        color: 'var(--cat-organize)',
        category: 'organize',
    },
    {
        title: 'Remove Pages',
        description: 'Select and delete unwanted pages with instant preview.',
        href: '/remove-pages',
        icon: Trash2,
        color: 'var(--cat-organize)',
        category: 'organize',
    },
    {
        title: 'Organize PDF',
        description: 'Drag and drop to rearrange, rotate, or remove pages.',
        href: '/organize-pdf',
        icon: LayoutGrid,
        color: 'var(--cat-organize)',
        category: 'organize',
    },

    // Optimize (Emerald)
    {
        title: 'Compress PDF',
        description: 'Shrink file size with precision quality presets.',
        href: '/compress-pdf',
        icon: Minimize2,
        color: 'var(--cat-optimize)',
        category: 'optimize',
    },
    {
        title: 'Repair PDF',
        description: 'Recover and restore unreadable or damaged PDF documents.',
        href: '/repair-pdf',
        icon: ShieldCheck,
        color: 'var(--cat-optimize)',
        category: 'optimize',
    },

    // Convert to PDF (Blue)
    {
        title: 'JPG to PDF',
        description: 'Convert JPG, PNG, and images to formatted PDF in seconds.',
        href: '/jpg-to-pdf',
        icon: Image,
        color: 'var(--cat-to-pdf)',
        category: 'to_pdf',
    },
    {
        title: 'Word to PDF',
        description: 'Turn DOC and DOCX documents into universal PDFs.',
        href: '/word-to-pdf',
        icon: FileText,
        color: 'var(--cat-to-pdf)',
        category: 'to_pdf',
    },
    {
        title: 'PowerPoint to PDF',
        description: 'Export PPT and PPTX slides to clean, presentation-ready PDF.',
        href: '/powerpoint-to-pdf',
        icon: Presentation,
        color: 'var(--cat-to-pdf)',
        category: 'to_pdf',
    },
    {
        title: 'Excel to PDF',
        description: 'Format spreadsheets and tables into easily readable PDFs.',
        href: '/excel-to-pdf',
        icon: FileSpreadsheet,
        color: 'var(--cat-to-pdf)',
        category: 'to_pdf',
    },
    {
        title: 'HTML to PDF',
        description: 'Render web pages and HTML files directly into PDF documents.',
        href: '/html-to-pdf',
        icon: FileCode,
        color: 'var(--cat-to-pdf)',
        category: 'to_pdf',
    },
    {
        title: 'Scan to PDF',
        description: 'Scan paper documents with your phone or laptop camera.',
        href: '/scan-to-pdf',
        icon: ScanLine,
        color: 'var(--cat-to-pdf)',
        category: 'to_pdf',
    },

    // Convert from PDF (Cyan)
    {
        title: 'PDF to Word',
        description: 'Convert PDF content into fully editable DOCX Word files.',
        href: '/pdf-to-word',
        icon: FileText,
        color: 'var(--cat-from-pdf)',
        category: 'from_pdf',
    },
    {
        title: 'PDF to PowerPoint',
        description: 'Transform PDF slides into editable PPTX presentations.',
        href: '/pdf-to-powerpoint',
        icon: Presentation,
        color: 'var(--cat-from-pdf)',
        category: 'from_pdf',
    },
    {
        title: 'PDF to Excel',
        description: 'Extract tables and structured data straight into Excel sheets.',
        href: '/pdf-to-excel',
        icon: FileSpreadsheet,
        color: 'var(--cat-from-pdf)',
        category: 'from_pdf',
    },
    {
        title: 'PDF to JPG',
        description: 'Export high-resolution images of each page or extract assets.',
        href: '/pdf-to-jpg',
        icon: Image,
        color: 'var(--cat-from-pdf)',
        category: 'from_pdf',
    },
    {
        title: 'PDF to PDF/A',
        description: 'Convert to ISO-standard PDF/A for long-term document archiving.',
        href: '/pdf-to-pdfa',
        icon: Archive,
        color: 'var(--cat-from-pdf)',
        category: 'from_pdf',
        access: 'premium',
    },
    {
        title: 'PDF to Text',
        description: 'Extract all text from a PDF, with OCR for scanned pages.',
        href: '/pdf-to-text',
        icon: Type,
        color: 'var(--cat-from-pdf)',
        category: 'from_pdf',
    },

    // Edit PDF (Purple)
    {
        title: 'Rotate PDF',
        description: 'Rotate individual pages or entire documents permanently.',
        href: '/rotate-pdf',
        icon: RotateCw,
        color: 'var(--cat-edit)',
        category: 'edit',
    },
    {
        title: 'Add Page Numbers',
        description: 'Number your pages with custom placement, font, and style.',
        href: '/add-page-numbers',
        icon: Hash,
        color: 'var(--cat-edit)',
        category: 'edit',
    },
    {
        title: 'Crop PDF',
        description: 'Trim margins and crop document pages to custom dimensions.',
        href: '/crop-pdf',
        icon: Crop,
        color: 'var(--cat-edit)',
        category: 'edit',
    },
    {
        title: 'Edit PDF',
        description: 'Annotate, highlight, and insert text directly onto PDF pages.',
        href: '/edit-pdf',
        icon: FileEdit,
        color: 'var(--cat-edit)',
        category: 'edit',
    },
    {
        title: 'Watermark PDF',
        description: 'Stamp custom text or confidential marks across your pages.',
        href: '/watermark-pdf',
        icon: Stamp,
        color: 'var(--cat-edit)',
        category: 'edit',
    },
    {
        title: 'Fill PDF Forms',
        description: 'Type into fillable forms, tick boxes and optionally flatten.',
        href: '/fill-pdf-form',
        icon: FormInput,
        color: 'var(--cat-edit)',
        category: 'edit',
    },

    // PDF Security (Ruby Red)
    {
        title: 'Unlock PDF',
        description: 'Remove passwords and permissions from your authorized PDFs.',
        href: '/unlock-pdf',
        icon: Unlock,
        color: 'var(--cat-security)',
        category: 'security',
    },
    {
        title: 'Protect PDF',
        description: 'Encrypt your document with robust password protection.',
        href: '/protect-pdf',
        icon: Lock,
        color: 'var(--cat-security)',
        category: 'security',
    },
    {
        title: 'Sign PDF',
        description: 'Draw, type, or place your signature directly onto your PDF.',
        href: '/sign-pdf',
        icon: PenTool,
        color: 'var(--cat-security)',
        category: 'security',
    },
    {
        title: 'Redact PDF',
        description: 'Permanently black out names, numbers and private details.',
        href: '/redact-pdf',
        icon: EyeOff,
        color: 'var(--cat-security)',
        category: 'security',
    },
    {
        title: 'Compare PDF',
        description: 'Review side-by-side visual and textual document revisions.',
        href: '/compare-pdf',
        icon: ArrowLeftRight,
        color: 'var(--cat-security)',
        category: 'security',
    },

    // AI PDF (Amber)
    {
        title: 'Summarize PDF',
        description: 'AI summary with key points, dates and action items.',
        href: '/summarize-pdf',
        icon: Sparkles,
        color: 'var(--cat-ai)',
        category: 'ai',
        access: 'account',
    },
    {
        title: 'Chat with PDF',
        description: 'Ask questions about your document and get cited answers.',
        href: '/chat-with-pdf',
        icon: MessagesSquare,
        color: 'var(--cat-ai)',
        category: 'ai',
        access: 'account',
    },
    {
        title: 'Translate PDF',
        description: 'Translate PDF text into Hindi, Tamil, English and more.',
        href: '/translate-pdf',
        icon: Languages,
        color: 'var(--cat-ai)',
        category: 'ai',
        access: 'account',
    },
];

/**
 * Format-specific landing pages that reuse an existing tool (not shown as separate cards).
 * Listed in the sitemap and linked from the parent tool's page.
 */
export const TOOL_VARIANTS: { title: string; href: string; parent: string }[] = [
    { title: 'PNG to PDF', href: '/png-to-pdf', parent: '/jpg-to-pdf' },
    { title: 'WebP to PDF', href: '/webp-to-pdf', parent: '/jpg-to-pdf' },
    { title: 'PDF to PNG', href: '/pdf-to-png', parent: '/pdf-to-jpg' },
];
