import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/_next/', '/account', '/auth/', '/reset-password'],
        },
        sitemap: 'https://www.pdfadore.com/sitemap.xml',
    };
}
