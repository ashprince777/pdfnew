import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: `${SITE.name} - Free PDF Tools`,
        short_name: SITE.name,
        description: 'Merge, split, compress, convert, sign and protect PDFs in your browser.',
        start_url: '/',
        display: 'standalone',
        background_color: '#faf9fe',
        theme_color: '#6d28d9',
        icons: [
            { src: '/brand/pdfadore-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
            { src: '/brand/pdfadore-icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
    };
}
