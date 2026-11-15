import type { Metadata } from 'next';
import Link from 'next/link';
import JpgToPdfClient from '@/app/jpg-to-pdf/JpgToPdfClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import JsonLd from '@/components/JsonLd';
import { JPG_PDF_SIZE_PRESETS_KB, sizeLabel, sizeSlug } from '@/lib/compressSizes';
import { toolSchema } from '@/lib/seo';
import { seoMetadata } from '@/lib/seoOverrides';

export function jpgPdfSizeMetadata(kb: number): Promise<Metadata> {
    return seoMetadata(`/jpg-to-pdf-under-${sizeSlug(kb)}`);
}

export default function JpgPdfSizeLanding({ kb }: { kb: number }) {
    const label = sizeLabel(kb);
    const path = `/jpg-to-pdf-under-${sizeSlug(kb)}`;
    const faqItems = [
        {
            question: `How do I convert a JPG to a PDF under ${label}?`,
            answer: `Add your photos on this page. The maximum PDF size is already set to ${label}, so click "Convert to PDF". The images are compressed only as much as needed for the finished PDF to fit.`,
        },
        {
            question: `Can I put several photos in one PDF under ${label}?`,
            answer: `Yes. Add all the photos and set their order. The ${label} limit is shared between them, so more photos means each one is compressed more. For many pages, a larger limit keeps the text easier to read.`,
        },
        {
            question: `What if the PDF cannot fit under ${label}?`,
            answer: 'The tool tells you the smallest size it could reach. Use fewer images, crop away empty borders before converting, or choose a larger limit if the form allows it.',
        },
        {
            question: 'Are my photos uploaded?',
            answer: 'No. The PDF is made inside your browser, so your photos never leave your phone or computer.',
        },
    ];

    return (
        <>
            <JsonLd data={toolSchema(path, { name: `JPG to PDF under ${label}`, description: `Convert photos into one PDF that stays under ${label}. Free, no sign-up, and nothing is uploaded.` })} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'JPG to PDF', item: '/jpg-to-pdf' },
                    { name: `JPG to PDF under ${label}`, item: path },
                ]}
            />
            <FaqSchema items={faqItems} />

            <JpgToPdfClient
                title={`JPG to PDF under ${label}`}
                subtitle={`Convert photos and scans into one PDF that stays under ${label}, ready for form uploads.`}
                defaultMaxKb={kb}
            />

            <div className="prose max-w-4xl mx-auto py-12 px-4 md:px-0" style={{ display: 'grid', gap: 18 }}>
                <h2 className="text-3xl font-bold">Make a PDF under {label} from your photos</h2>
                <p className="text-lg text-gray-700">
                    Many application portals accept documents only as a PDF with a size limit, while your certificate or ID is a photo on your phone.
                    This page converts the photo to PDF and keeps the file under {label} in one step. Always check the exact limit in the official
                    notification, because limits differ between forms.
                </p>

                <h2 className="text-2xl font-semibold text-gray-800">How to convert JPG to PDF under {label}</h2>
                <ol className="list-decimal pl-6 text-gray-700" style={{ display: 'grid', gap: 6 }}>
                    <li>Click <strong>Select Images</strong> above and choose your photos (JPG, PNG or WebP).</li>
                    <li>Drag them into the right order and pick a page size.</li>
                    <li>Check that the maximum PDF size shows {kb} KB, then click <strong>Convert to PDF</strong>.</li>
                    <li>Download the PDF and upload it to the form.</li>
                </ol>

                <h2 className="text-2xl font-semibold text-gray-800">Other sizes</h2>
                <p className="text-gray-700">
                    {JPG_PDF_SIZE_PRESETS_KB.filter((size) => size !== kb).map((size, i) => (
                        <span key={size}>
                            {i > 0 && ' · '}
                            <Link href={`/jpg-to-pdf-under-${sizeSlug(size)}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                JPG to PDF under {sizeLabel(size)}
                            </Link>
                        </span>
                    ))}
                    {' · '}
                    <Link href="/compress-pdf" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        Already have a PDF? Compress PDF
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
