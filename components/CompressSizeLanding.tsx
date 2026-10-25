import type { Metadata } from 'next';
import Link from 'next/link';
import CompressClient from '@/app/compress-pdf/CompressClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import { SIZE_PRESETS_KB, sizeLabel, sizeSlug } from '@/lib/compressSizes';
import JsonLd from '@/components/JsonLd';
import { pageMetadata, toolSchema } from '@/lib/seo';

/** Where each size limit typically comes up, so every landing page has its own useful copy. */
const USE_CASES: Record<number, string> = {
    20: 'A 20 KB limit usually applies to a single-page upload such as a signature, thumb impression or small certificate on recruitment and scholarship portals.',
    50:'Very small limits like 50 KB are common for signature and certificate uploads in scholarship, admission and recruitment forms.',
    100: 'Many government job, exam and admission portals ask for documents under 100 KB, such as caste, income or domicile certificates.',
    150: 'Some university, exam and bank portals set a 150 KB cap for scanned documents such as mark sheets, ID cards and fee receipts.',
    200: 'A 200 KB limit is one of the most common on Indian online forms, for example for mark sheets, ID proof and supporting documents.',
    300: 'A 300 KB limit is common for multi-page documents on job, admission and loan application portals, such as experience letters or degree certificates.',
    400: 'Limits around 400 KB come up on some state government, university and recruitment portals for multi-page certificates and supporting documents.',
    500: 'Portals that accept larger scans, such as some passport, visa, bank and insurance forms, often allow up to 500 KB per document.',
    1024: 'A 1 MB limit is typical for email-friendly attachments, college applications and many company HR and KYC portals.',
    2048: 'A 2 MB limit is common for tender documents, court e-filing, insurance claims and longer reports that you need to email or upload in one file.',
};

export function compressSizeMetadata(kb: number): Metadata {
    return pageMetadata(`/compress-pdf-to-${sizeSlug(kb)}`);
}

export default function CompressSizeLanding({ kb }: { kb: number }) {
    const label = sizeLabel(kb);
    const faqItems = [
        {
            question: `How do I compress a PDF to ${label}?`,
            answer: `Upload your PDF on this page. The size is already set to ${label}, so just click "Compress PDF". PDFAdore tries gentle settings first and only compresses harder if needed, then you download the result.`,
        },
        {
            question: `Will my PDF still be readable at ${label}?`,
            answer: `For most documents, yes. Text and images are kept as sharp as the ${label} limit allows. For very long or image-heavy PDFs, pages may be saved as images to fit, so the text is no longer selectable but stays readable.`,
        },
        {
            question: `What if my PDF cannot get under ${label}?`,
            answer: 'Very long documents sometimes cannot fit a small limit. Split the PDF into parts with Split PDF, remove pages you do not need, or upload each page separately if the form allows it.',
        },
        {
            question: 'Is my document uploaded to your servers?',
            answer: 'No. Compression runs entirely in your browser, on your own phone or computer. Your PDF is never uploaded.',
        },
    ];

    return (
        <>
            <JsonLd
                data={toolSchema(`/compress-pdf-to-${sizeSlug(kb)}`, {
                    name: `Compress PDF to ${label}`,
                    description: `Reduce a PDF to under ${label} in your browser. Free, no sign-up, and the file is never uploaded.`,
                })}
            />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Compress PDF', item: '/compress-pdf' },
                    { name: `Compress PDF to ${label}`, item: `/compress-pdf-to-${sizeSlug(kb)}` },
                ]}
            />
            <FaqSchema items={faqItems} />

            <CompressClient defaultTargetKb={kb} />

            <div className="prose max-w-4xl mx-auto py-12 px-4 md:px-0" style={{ display: 'grid', gap: 18 }}>
                <h2 className="text-3xl font-bold">Reduce PDF size to {label} for online forms</h2>
                <p className="text-lg text-gray-700">
                    {USE_CASES[kb]} Always check the exact limit in the official notification or on the portal, because limits differ between
                    forms.
                </p>

                <h2 className="text-2xl font-semibold text-gray-800">How to compress a PDF to {label}</h2>
                <ol className="list-decimal pl-6 text-gray-700" style={{ display: 'grid', gap: 6 }}>
                    <li>Click <strong>Select PDF file</strong> above and choose your document (on a phone, pick it from Files or Downloads).</li>
                    <li>Check that <strong>Fit to a size</strong> is selected and the limit shows {label}.</li>
                    <li>Click <strong>Compress PDF</strong> and wait a few seconds.</li>
                    <li>Download the smaller PDF and upload it to the form.</li>
                </ol>

                <h2 className="text-2xl font-semibold text-gray-800">Other sizes</h2>
                <p className="text-gray-700">
                    {SIZE_PRESETS_KB.filter((size) => size !== kb).map((size, i) => (
                        <span key={size}>
                            {i > 0 && ' · '}
                            <Link href={`/compress-pdf-to-${sizeSlug(size)}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                Compress PDF to {sizeLabel(size)}
                            </Link>
                        </span>
                    ))}
                    {' · '}
                    <Link href="/blog/reduce-pdf-size-for-government-forms" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        Guide: reduce PDF size for government forms
                    </Link>
                </p>

                <h2 className="text-2xl font-semibold text-gray-800">Frequently asked questions</h2>
                {faqItems.map((item) => (
                    <div key={item.question}>
                        <h3 className="text-lg font-semibold">{item.question}</h3>
                        <p className="text-gray-700">{item.answer}</p>
                    </div>
                ))}
            </div>
        </>
    );
}
