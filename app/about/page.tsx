import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About Us',
    description: 'PDFAdore offers free, private PDF tools that run entirely in your browser.',
    alternates: {
        canonical: '/about',
    },
};

export default function AboutPage() {
    return (
        <div className="container" style={{ padding: '60px 20px', maxWidth: '800px' }}>
            <h1>About PDFAdore</h1>
            <p className="lead">We make working with PDFs easy.</p>

            <p className="mt-4">
                PDFAdore was born from the need for a simple, accessible, and fast solution for PDF manipulation.
                Our goal is to provide high-quality tools that are free to use for everyone.
            </p>

            <p className="mt-4">
                We prioritize privacy and speed. By leveraging modern browser technologies,
                we perform most operations directly on your device, ensuring your documents remain secure.
            </p>
        </div>
    );
}
