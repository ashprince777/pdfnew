import { MetadataRoute } from 'next';

const BASE_URL = 'https://myonlinepdf.com';

export default function sitemap(): MetadataRoute.Sitemap {
    const routes = [
        '',
        '/merge-pdf',
        '/split-pdf',
        '/compress-pdf',
        '/protect-pdf',
        '/unlock-pdf',
        '/rotate-pdf',
        '/organize-pdf',
        '/jpg-to-pdf',
        '/pdf-to-jpg',
        '/pdf-to-powerpoint',
        // Planned/Placeholder tools - enabling them in sitemap for discoverability if pages exist
        '/word-to-pdf',
        '/excel-to-pdf',
        '/powerpoint-to-pdf',
        '/pdf-to-word',
        '/pdf-to-excel',
        '/watermark-pdf',
        '/repair-pdf',
    ].map((route) => ({
        url: `${BASE_URL}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    return routes;
}
