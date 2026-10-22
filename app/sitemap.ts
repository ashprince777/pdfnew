import { MetadataRoute } from 'next';
import { ALL_TOOLS } from '@/lib/tools';

const BASE_URL = 'https://myonlinepdf.com';
// Bump when page content changes meaningfully; a per-request date tells crawlers everything changes daily.
const LAST_UPDATED = new Date('2026-10-21');

const STATIC_PAGES = ['/pricing', '/refund-policy', '/all-tools', '/faq', '/about', '/contact', '/privacy', '/terms', '/deletion-policy'];

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        { url: BASE_URL, lastModified: LAST_UPDATED, changeFrequency: 'weekly', priority: 1 },
        ...ALL_TOOLS.map((tool) => ({
            url: `${BASE_URL}${tool.href}`,
            lastModified: LAST_UPDATED,
            changeFrequency: 'monthly' as const,
            priority: 0.8,
        })),
        ...STATIC_PAGES.map((path) => ({
            url: `${BASE_URL}${path}`,
            lastModified: LAST_UPDATED,
            changeFrequency: 'yearly' as const,
            priority: 0.3,
        })),
    ];
}
