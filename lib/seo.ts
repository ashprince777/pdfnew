import type { Metadata } from 'next';
import { SITE } from './site';
import { ALL_TOOLS } from './tools';
import { SIZE_PRESETS_KB, sizeLabel, sizeSlug } from './compressSizes';
import { ARTICLES, type Article } from './blog';

/**
 * Search metadata for every indexable page, in one place.
 *
 * - `title` is the full <title> (the layout's " | PDFAdore" template is NOT added), kept under ~60 characters.
 * - `description` is 140-160 characters.
 */
export interface PageSeo {
    title: string;
    description: string;
}

export const PAGE_SEO: Record<string, PageSeo> = {
    '/': {
        title: 'PDFAdore: Free Online PDF Tools - Merge, Compress, Convert',
        description: 'Merge, split, compress, convert, sign and edit PDFs free in your browser. Files never leave your device. No sign-up, no watermark, works on any phone.',
    },
    // ---- Tools -------------------------------------------------------------------------------------
    '/merge-pdf': {
        title: 'Merge PDF Online Free - Combine PDFs | PDFAdore',
        description: 'Combine PDF files into one document for free. Drag to set the order, works on mobile, and your files are never uploaded to a server. No sign-up needed.',
    },
    '/split-pdf': {
        title: 'Split PDF Online Free - Extract Pages from PDF | PDFAdore',
        description: 'Split a PDF into separate files or extract only the pages you need. Free, fast and private: your PDF is processed in your browser and never uploaded.',
    },
    '/remove-pages': {
        title: 'Delete Pages from PDF Online Free - Remove Pages | PDFAdore',
        description: 'Delete unwanted pages from a PDF in seconds. Click the pages to remove or type page numbers. Free, no sign-up, and your file never leaves your device.',
    },
    '/organize-pdf': {
        title: 'Rearrange PDF Pages Online Free - Organize PDF | PDFAdore',
        description: 'Reorder, rotate and delete PDF pages with simple drag and drop. Free online page organizer that works on phone and desktop, with no file upload needed.',
    },
    '/compress-pdf': {
        title: 'Compress PDF to 100KB, 200KB Online Free | PDFAdore',
        description: 'Reduce PDF size online for free, or compress to an exact size like 100 KB or 200 KB for government and exam forms. No upload and no sign-up required.',
    },
    '/repair-pdf': {
        title: 'Repair PDF Online Free - Fix Corrupted PDF | PDFAdore',
        description: 'Fix a damaged or corrupted PDF that will not open. PDFAdore rebuilds the file structure and keeps text and links. Free, private and works in your browser.',
    },
    '/jpg-to-pdf': {
        title: 'JPG to PDF - Image to PDF Converter Free | PDFAdore',
        description: 'Convert JPG, PNG and phone photos into one PDF for free. Set page size, margins and order. Works on mobile and your images are never uploaded anywhere.',
    },
    '/word-to-pdf': {
        title: 'Word to PDF Converter Online Free - DOCX | PDFAdore',
        description: 'Convert Word documents (DOCX) to PDF online for free, keeping headings, tables and images. No sign-up and no upload: conversion runs in your browser.',
    },
    '/powerpoint-to-pdf': {
        title: 'PowerPoint to PDF Online Free - PPTX to PDF | PDFAdore',
        description: 'Convert PowerPoint presentations (PPTX) to PDF for free, with backgrounds, shapes, images and text. Private conversion in your browser with no upload.',
    },
    '/excel-to-pdf': {
        title: 'Excel to PDF Converter Free - XLSX & CSV | PDFAdore',
        description: 'Turn Excel spreadsheets (XLSX, XLS, CSV) into clean, readable PDF tables for free. No sign-up, no watermark, and your data never leaves your device.',
    },
    '/html-to-pdf': {
        title: 'HTML to PDF Converter Online Free | PDFAdore',
        description: 'Convert HTML files or pasted HTML code into a clean, searchable PDF document. Free, fast and private: everything runs in your browser with no upload.',
    },
    '/scan-to-pdf': {
        title: 'Scan to PDF Online Free - Phone Camera Scanner | PDFAdore',
        description: 'Use your phone or laptop camera to scan paper documents into a clean black-and-white PDF. Free online scanner app that never uploads your photos.',
    },
    '/pdf-to-word': {
        title: 'PDF to Word Converter Free - Editable DOCX | PDFAdore',
        description: 'Convert PDF to an editable Word document (DOCX) for free, keeping paragraphs and simple tables. No sign-up, and your PDF is never uploaded to a server.',
    },
    '/pdf-to-powerpoint': {
        title: 'PDF to PowerPoint Converter Free - PPTX | PDFAdore',
        description: 'Turn every page of a PDF into a PowerPoint slide (PPTX) for free. Great for reusing reports in presentations. Private conversion in your browser.',
    },
    '/pdf-to-excel': {
        title: 'PDF to Excel Converter Free - PDF to XLSX | PDFAdore',
        description: 'Extract tables and data from PDF files into an editable Excel spreadsheet (XLSX) for free. No sign-up, no watermark, and nothing is uploaded anywhere.',
    },
    '/pdf-to-jpg': {
        title: 'PDF to JPG Converter Free - PDF to Image | PDFAdore',
        description: 'Convert each PDF page into a high-quality JPG or PNG image for free. Download all pages as a ZIP. Works on phone and desktop with no file upload needed.',
    },
    '/pdf-to-png': {
        title: 'PDF to PNG Converter Online Free - High Quality | PDFAdore',
        description: 'Convert PDF pages to sharp, lossless PNG images for free. Choose 96, 150 or 300 DPI and download all pages as a ZIP. No upload, works on phone and PC.',
    },
    '/pdf-to-text': {
        title: 'PDF to Text Converter Free - Extract Text & OCR | PDFAdore',
        description: 'Extract all text from a PDF into a plain .txt file for free, with OCR for scanned pages. Copy or download the text. Your PDF is never uploaded anywhere.',
    },
    '/png-to-pdf': {
        title: 'PNG to PDF Converter Online Free - Combine PNGs | PDFAdore',
        description: 'Convert PNG images and screenshots into one PDF for free. Reorder pages, pick A4 or original size, and download. No sign-up and nothing is uploaded.',
    },
    '/webp-to-pdf': {
        title: 'WebP to PDF Converter Online Free | PDFAdore',
        description: 'Convert WebP images saved from websites and WhatsApp into a PDF for free. Combine many WebP files into one document. No upload, works on any device.',
    },
    '/pdf-to-pdfa': {
        title: 'PDF to PDF/A Converter - Archival PDF | PDFAdore',
        description: 'Convert PDFs to PDF/A-1b, 2b or 3b for long-term archiving, with PDF/A metadata and an embedded colour profile. Private, in-browser, included in Premium.',
    },
    '/rotate-pdf': {
        title: 'Rotate PDF Online Free - Rotate PDF Pages | PDFAdore',
        description: 'Rotate all pages or single pages of a PDF and save the result permanently. Free, quick and private PDF rotator that works on mobile, with no upload.',
    },
    '/add-page-numbers': {
        title: 'Add Page Numbers to PDF Online Free | PDFAdore',
        description: 'Insert page numbers into any PDF and choose the position, format and starting number. Free, no watermark, and your document never leaves your device.',
    },
    '/crop-pdf': {
        title: 'Crop PDF Online Free - Trim PDF Margins | PDFAdore',
        description: 'Trim white margins from every page of a PDF with a live preview of what will be removed. Free online PDF cropper with no sign-up and no file upload.',
    },
    '/edit-pdf': {
        title: 'PDF Editor Online Free - Edit Text in PDF | PDFAdore',
        description: 'Edit existing text in a PDF, add new text, white out or highlight content, and replace images. Free online PDF editor that works in your browser.',
    },
    '/watermark-pdf': {
        title: 'Add Watermark to PDF Online Free | PDFAdore',
        description: 'Stamp text or your own logo across every page of a PDF. Set position, size and transparency. Free online watermark tool with no upload or sign-up.',
    },
    '/fill-pdf-form': {
        title: 'Fill PDF Forms Online Free - Type in PDF | PDFAdore',
        description: 'Type into the fields of any fillable PDF form, then download it filled in or flattened. Free, works on phone and computer, and your data stays on device.',
    },
    '/unlock-pdf': {
        title: 'PDF Password Remover - Unlock PDF Free | PDFAdore',
        description: 'Remove the password and restrictions from a PDF you can open, such as Aadhaar, PAN or bank statements. Free and private: the file is never uploaded.',
    },
    '/protect-pdf': {
        title: 'Protect PDF with Password - Encrypt Free | PDFAdore',
        description: 'Add a password to a PDF with strong AES-256 encryption and choose who can print or copy it. Free online PDF protector that never uploads your file.',
    },
    '/sign-pdf': {
        title: 'Sign PDF Online Free - eSignature on PDF | PDFAdore',
        description: 'Draw, type or upload your signature and place it on any PDF page. Free online PDF signer that works on phone and computer, without printing or upload.',
    },
    '/redact-pdf': {
        title: 'Redact PDF Online Free - Black Out Text | PDFAdore',
        description: 'Permanently remove names, account numbers and other sensitive text from a PDF. Redacted text is deleted, not just covered. Free, private, in-browser.',
    },
    '/compare-pdf': {
        title: 'Compare PDF Files Online Free - Find Changes | PDFAdore',
        description: 'Compare two versions of a PDF and see exactly what text was added, removed or changed, page by page. Free, private and downloadable as a report PDF.',
    },
    '/summarize-pdf': {
        title: 'Summarize PDF with AI Free - PDF Summarizer | PDFAdore',
        description: 'Get the key points, dates and action items of any PDF in seconds with AI. Free account includes 3 AI credits a month. Your PDF file stays on your device.',
    },
    '/chat-with-pdf': {
        title: 'Chat with PDF - Ask Questions with AI Free | PDFAdore',
        description: 'Ask questions about any PDF and get answers with page citations from AI. Works for reports, contracts and notes. Free account with 3 AI credits a month.',
    },
    '/translate-pdf': {
        title: 'Translate PDF to Hindi, Tamil & More with AI | PDFAdore',
        description: 'Translate PDF text into Hindi, Tamil, Malayalam, English and 20+ other languages with AI. Free account includes 3 AI credits a month. Fast and private.',
    },
    // ---- Static pages --------------------------------------------------------------------------------
    '/all-tools': {
        title: 'All 32 Free PDF Tools in One Place | PDFAdore',
        description: 'Every PDFAdore tool in one list: merge, split, compress, convert, edit, sign, protect and AI PDF tools. Free, private and runs right in your browser.',
    },
    '/pricing': {
        title: 'PDFAdore Pricing - Free Plan & Premium',
        description: 'PDFAdore is free for everyday PDF tasks. Premium unlocks bigger files, more files per task, OCR and 200 AI credits a month, with a 7-day free trial.',
    },
    '/blog': {
        title: 'PDF Guides & Tips for India | PDFAdore Blog',
        description: 'Practical PDF guides for India: Aadhaar and PAN PDF passwords, reducing PDF size for government forms, merging, splitting, converting and translating.',
    },
    '/faq': {
        title: 'PDFAdore FAQ - Free, Private PDF Tools Explained',
        description: 'Answers to common questions about PDFAdore: is it free, are files uploaded, is it safe, file limits, Premium and how our in-browser PDF tools work.',
    },
    '/about': {
        title: 'About PDFAdore - Private PDF Tools from India',
        description: 'PDFAdore is a privacy-first PDF toolkit by Foxora Digital LLP, Kozhikode. Every core tool runs in your browser, so your documents never leave your device.',
    },
    '/contact': {
        title: 'Contact PDFAdore - Support & Business Details',
        description: 'Contact PDFAdore support by email or phone. Business details of Foxora Digital LLP, Kozhikode, Kerala, our grievance officer and our support hours.',
    },
    '/privacy': {
        title: 'Privacy Policy | PDFAdore',
        description: 'How PDFAdore protects your privacy: your PDFs are processed in your browser and never uploaded. What little data we collect for accounts and payments, and why.',
    },
    '/terms': {
        title: 'Terms of Service | PDFAdore',
        description: 'The terms for using PDFAdore free PDF tools and Premium subscriptions, operated by Foxora Digital LLP, including billing, acceptable use and governing law.',
    },
    '/refund-policy': {
        title: 'Cancellation & Refund Policy | PDFAdore',
        description: 'How PDFAdore Premium cancellations and refunds work: cancel anytime, keep access until the period ends, and a full refund within 7 days of first payment.',
    },
    '/shipping-policy': {
        title: 'Shipping & Delivery Policy | PDFAdore',
        description: 'PDFAdore Premium is a digital service delivered instantly online after payment. Nothing is shipped. Learn how access is delivered and who to contact.',
    },
    '/deletion-policy': {
        title: 'File Deletion Policy - Your Files Stay Private | PDFAdore',
        description: 'Your files are processed in your browser and never uploaded to our servers, so there is nothing to delete on our side. Here is exactly how that works.',
    },
};

/**
 * Search titles/descriptions for blog posts. The on-page headline (H1) stays the article's full title;
 * only the <title> tag and snippet text are shortened to fit search results.
 */
export const BLOG_SEO: Record<string, PageSeo> = {
    'aadhaar-pan-itr-pdf-password': {
        title: 'Aadhaar, PAN & ITR PDF Password Format (2026 Guide)',
        description: 'Password formats for e-Aadhaar, e-PAN, ITR-V, AIS and Form 26AS PDFs, why bank statements differ, and how to remove the password to print or upload.',
    },
    'reduce-pdf-size-for-government-forms': {
        title: 'Reduce PDF Size to 100 KB or 200 KB for Govt Forms',
        description: 'Make documents fit the 100 KB or 200 KB limits on Indian government, exam and admission portals without losing readability. Free, step-by-step guide.',
    },
    'how-to-remove-password-from-pdf': {
        title: 'How to Remove a Password from a PDF (Phone & PC)',
        description: 'Save a copy of a protected PDF without its password in four steps, on Android, iPhone, Windows or Mac, using a free PDF password remover with no upload.',
    },
    'photo-to-pdf-on-phone': {
        title: 'How to Convert Photos to PDF on Phone (Free, No App)',
        description: 'Turn photos of documents, notes or receipts into one clean PDF on your Android phone or iPhone, for free and without installing any app. Step-by-step.',
    },
    'how-to-merge-pdf-files': {
        title: 'How to Merge PDF Files into One (Free, No Upload)',
        description: 'Combine several PDFs into one document in the order you want, on phone or computer, without uploading your files anywhere. Free step-by-step guide.',
    },
    'how-to-split-pdf-pages': {
        title: 'How to Split PDF Pages or Extract Specific Pages',
        description: 'Extract only the pages you need from a PDF, split it into several files, or save every page separately. Free, private, and works on phone or computer.',
    },
    'how-to-convert-pdf-to-word': {
        title: 'How to Convert PDF to Word and Keep the Formatting',
        description: 'Turn a PDF into an editable Word document with its text, tables and layout intact, plus what to do with scanned PDFs. Free guide, no upload needed.',
    },
    'extract-text-from-scanned-pdf': {
        title: 'Extract Text from Scanned PDF with OCR (Free Guide)',
        description: 'How to copy text out of any PDF, including scanned pages and phone photos, using free in-browser OCR. Download the text as a .txt file.',
    },
    'translate-pdf-to-hindi': {
        title: 'How to Translate a PDF to Hindi or English with AI',
        description: 'Translate the text of a PDF into Hindi, English, Tamil, Malayalam and other languages with AI, then download the translation as a Word file. Free.',
    },
};

/** Size-variant compress pages (/compress-pdf-to-100kb etc.). */
for (const kb of SIZE_PRESETS_KB) {
    const label = sizeLabel(kb);
    PAGE_SEO[`/compress-pdf-to-${sizeSlug(kb)}`] = {
        title: `Compress PDF to ${label} Online Free | PDFAdore`,
        description: `Reduce a PDF to under ${label} in seconds for government forms, exam applications and email. Free, no sign-up, and your file never leaves your device.`,
    };
}

export const absoluteUrl = (path: string) => (path === '/' ? SITE.url : `${SITE.url}${path}`);

export interface MetadataOptions {
    /** Defaults to the registry entry for `path`. */
    title?: string;
    description?: string;
    type?: 'website' | 'article';
    publishedTime?: string;
    modifiedTime?: string;
}

/** Full metadata for an indexable page: canonical, Open Graph and Twitter all point at the same URL and copy. */
export function pageMetadata(path: string, options: MetadataOptions = {}): Metadata {
    const entry = PAGE_SEO[path];
    const title = options.title ?? entry?.title;
    const description = options.description ?? entry?.description;
    if (!title || !description) throw new Error(`No SEO entry for ${path}`);
    const url = absoluteUrl(path);
    const type = options.type ?? 'website';
    // Child pages that set their own openGraph do not inherit app/opengraph-image, so point at it explicitly.
    const image = { url: `${SITE.url}/opengraph-image`, width: 1200, height: 630, alt: `${SITE.name}: free, private PDF tools in your browser` };
    return {
        title: { absolute: title },
        description,
        alternates: { canonical: url },
        openGraph: {
            title,
            description,
            url,
            siteName: SITE.name,
            locale: 'en_IN',
            images: [image],
            ...(type === 'article'
                ? { type: 'article', publishedTime: options.publishedTime, modifiedTime: options.modifiedTime ?? options.publishedTime, authors: [SITE.name] }
                : { type: 'website' }),
        },
        twitter: { card: 'summary_large_image', title, description, images: [image.url] },
    };
}

/** Metadata for private pages (account, login, admin...): kept out of search results. */
export function privateMetadata(title: string, description?: string): Metadata {
    return {
        title,
        description,
        robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    };
}

// ---------------------------------------------------------------------------------------------
// JSON-LD builders (rendered with <JsonLd />)

type Json = Record<string, unknown>;

const ORG_ID = `${SITE.url}/#organization`;
const SITE_ID = `${SITE.url}/#website`;

/** Compact publisher object usable on any page (the full Organization node is only on the homepage). */
const orgRef = (): Json => ({
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE.name,
    url: SITE.url,
    logo: { '@type': 'ImageObject', url: `${SITE.url}/brand/pdfadore-icon-512.png`, width: 512, height: 512 },
});

export function organizationSchema(): Json {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': ORG_ID,
        name: SITE.name,
        legalName: SITE.legalName,
        url: SITE.url,
        logo: { '@type': 'ImageObject', url: `${SITE.url}/brand/pdfadore-icon-512.png`, width: 512, height: 512 },
        email: SITE.supportEmail,
        telephone: SITE.phone,
        address: { '@type': 'PostalAddress', streetAddress: SITE.address, addressLocality: 'Kozhikode', addressRegion: 'Kerala', addressCountry: 'IN' },
        contactPoint: [{ '@type': 'ContactPoint', contactType: 'customer support', email: SITE.supportEmail, telephone: SITE.phone, areaServed: 'Worldwide', availableLanguage: ['English'] }],
    };
}

export function websiteSchema(): Json {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': SITE_ID,
        name: SITE.name,
        alternateName: 'PDF Adore',
        url: SITE.url,
        description: PAGE_SEO['/'].description,
        inLanguage: 'en-IN',
        publisher: { '@id': ORG_ID },
    };
}

export function breadcrumbSchema(items: { name: string; path: string }[]): Json {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: absoluteUrl(item.path) })),
    };
}

export function faqSchema(items: { question: string; answer: string }[]): Json {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })),
    };
}

export function howToSchema(name: string, steps: string[], path: string): Json {
    return {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name,
        url: absoluteUrl(path),
        tool: [{ '@type': 'HowToTool', name: 'A web browser' }],
        totalTime: 'PT1M',
        estimatedCost: { '@type': 'MonetaryAmount', currency: 'INR', value: '0' },
        step: steps.map((text, index) => ({ '@type': 'HowToStep', position: index + 1, name: `Step ${index + 1}`, text })),
    };
}

const TOOL_CATEGORY: Record<string, string> = {
    organize: 'Organize PDF',
    optimize: 'Optimize PDF',
    to_pdf: 'Convert to PDF',
    from_pdf: 'Convert from PDF',
    edit: 'Edit PDF',
    security: 'PDF security',
    ai: 'AI PDF tools',
};

/** SoftwareApplication (web app) markup for a tool page. Prices are the real ones; no ratings are invented. */
export function toolSchema(path: string, overrides: { name?: string; description?: string } = {}): Json {
    const tool = ALL_TOOLS.find((t) => t.href === path);
    const seo = PAGE_SEO[path];
    const name = overrides.name ?? tool?.title ?? seo?.title ?? SITE.name;
    const free = tool?.access !== 'premium';
    return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        '@id': `${absoluteUrl(path)}#app`,
        name: `${name} - ${SITE.name}`,
        url: absoluteUrl(path),
        description: overrides.description ?? seo?.description ?? tool?.description,
        applicationCategory: 'UtilitiesApplication',
        applicationSubCategory: tool ? TOOL_CATEGORY[tool.category] : 'PDF tool',
        operatingSystem: 'Any (runs in a web browser: Windows, macOS, Linux, Android, iOS)',
        browserRequirements: 'Requires a modern browser with JavaScript enabled.',
        inLanguage: 'en',
        isAccessibleForFree: free,
        offers: free
            ? { '@type': 'Offer', price: '0', priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: absoluteUrl(path) }
            : { '@type': 'Offer', price: '299', priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: absoluteUrl('/pricing'), description: 'Included with PDFAdore Premium (monthly plan).' },
        featureList: tool?.access === 'account' ? 'AI-powered; needs a free account (3 AI credits a month)' : 'Files are processed in your browser and never uploaded',
        provider: orgRef(),
        publisher: orgRef(),
    };
}

/** Article markup for a blog post (Google Article rich result fields). */
export function articleSchema(article: Article): Json {
    const url = absoluteUrl(`/blog/${article.slug}`);
    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: article.title.length > 110 ? BLOG_SEO[article.slug]?.title ?? article.title.slice(0, 110) : article.title,
        description: BLOG_SEO[article.slug]?.description ?? article.description,
        image: [`${SITE.url}/opengraph-image`],
        datePublished: article.published,
        dateModified: article.published,
        inLanguage: 'en-IN',
        author: { '@type': 'Organization', name: SITE.name, url: SITE.url },
        publisher: orgRef(),
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        about: { '@type': 'Thing', name: article.tool.label, url: absoluteUrl(article.tool.href) },
    };
}

/** Blog index markup listing every post. */
export function blogSchema(): Json {
    return {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        '@id': `${SITE.url}/blog#blog`,
        name: `${SITE.name} PDF guides`,
        url: absoluteUrl('/blog'),
        description: PAGE_SEO['/blog'].description,
        inLanguage: 'en-IN',
        publisher: orgRef(),
        blogPost: ARTICLES.map((a) => ({
            '@type': 'BlogPosting',
            headline: BLOG_SEO[a.slug]?.title ?? a.title,
            url: absoluteUrl(`/blog/${a.slug}`),
            datePublished: a.published,
        })),
    };
}
