import type { Metadata } from 'next';
import Link from 'next/link';
import CompressImageClient from '@/app/compress-image/CompressImageClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import JsonLd from '@/components/JsonLd';
import { IMAGE_SIZE_PRESETS_KB, sizeLabel, sizeSlug } from '@/lib/compressSizes';
import { toolSchema } from '@/lib/seo';
import { seoMetadata } from '@/lib/seoOverrides';

/** Where each photo size limit typically comes up, so every landing page has its own useful copy. */
const USE_CASES: Record<number, string> = {
    10: 'Limits as small as 10 KB usually apply to signature or thumb-impression uploads on recruitment and scholarship forms.',
    20: 'A 20 KB limit is very common for the signature upload on government job, bank exam and admission forms.',
    50: 'Many exam and recruitment forms ask for a passport-size photo under 50 KB.',
    100: 'A 100 KB limit is common for photos and ID scans on admission, scholarship and KYC forms.',
    200: 'Portals that accept clearer pictures, such as some passport, visa and university forms, often allow photos up to 200 KB.',
    500: 'A 500 KB limit usually applies to document photos, such as certificates and mark sheets uploaded as images.',
};

export function imageSizeMetadata(kb: number): Promise<Metadata> {
    return seoMetadata(`/resize-image-to-${sizeSlug(kb)}`);
}

export default function ImageSizeLanding({ kb }: { kb: number }) {
    const label = sizeLabel(kb);
    const path = `/resize-image-to-${sizeSlug(kb)}`;
    const faqItems = [
        {
            question: `How do I resize an image to ${label}?`,
            answer: `Select your photo on this page. The limit is already set to ${label}, so just click "Compress image" and download the JPG. PDFAdore keeps the highest quality that fits under ${label}.`,
        },
        {
            question: `Can I compress a JPEG to ${label} without losing quality?`,
            answer: `Some quality is always traded for size, but the tool uses the lightest compression that fits, so faces and text stay as clear as ${label} allows. Only if that is not enough does it make the picture smaller in pixels.`,
        },
        {
            question: 'Can I also set the width and height in pixels?',
            answer: 'Yes. Type the width and height the form asks for, in pixels. The photo is resized to exactly that size and then compressed under the limit. If the shape is different, the edges are trimmed evenly.',
        },
        {
            question: 'Is my photo uploaded to your servers?',
            answer: 'No. The image is compressed inside your browser, on your own phone or computer. It is never uploaded.',
        },
    ];

    return (
        <>
            <JsonLd data={toolSchema(path, { name: `Resize Image to ${label}`, description: `Compress a photo or signature to under ${label} in your browser. Free, no sign-up, and the image is never uploaded.` })} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Compress Image', item: '/compress-image' },
                    { name: `Resize Image to ${label}`, item: path },
                ]}
            />
            <FaqSchema items={faqItems} />

            <CompressImageClient defaultTargetKb={kb} />

            <div className="prose max-w-4xl mx-auto py-12 px-4 md:px-0" style={{ display: 'grid', gap: 18 }}>
                <h2 className="text-3xl font-bold">Compress a photo or signature to {label} for online forms</h2>
                <p className="text-lg text-gray-700">
                    {USE_CASES[kb]} Always check the exact size, pixel dimensions and file type in the official notification, because they differ
                    between forms.
                </p>

                <h2 className="text-2xl font-semibold text-gray-800">How to resize an image to {label}</h2>
                <ol className="list-decimal pl-6 text-gray-700" style={{ display: 'grid', gap: 6 }}>
                    <li>Click <strong>Select Image</strong> above and choose your photo or signature (JPG, PNG or WebP).</li>
                    <li>Check that the maximum file size shows {kb} KB. If the form gives a width and height in pixels, type them in.</li>
                    <li>Click <strong>Compress image</strong>.</li>
                    <li>Download the JPG and upload it to the form.</li>
                </ol>

                <h2 className="text-2xl font-semibold text-gray-800">Other sizes</h2>
                <p className="text-gray-700">
                    {IMAGE_SIZE_PRESETS_KB.filter((size) => size !== kb).map((size, i) => (
                        <span key={size}>
                            {i > 0 && ' · '}
                            <Link href={`/resize-image-to-${sizeSlug(size)}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                Resize image to {sizeLabel(size)}
                            </Link>
                        </span>
                    ))}
                    {' · '}
                    <Link href="/jpg-to-pdf" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        Need a PDF instead? JPG to PDF
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
