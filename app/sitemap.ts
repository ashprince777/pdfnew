import { MetadataRoute } from 'next';
import { ALL_TOOLS, TOOL_VARIANTS } from '@/lib/tools';
import { ARTICLES } from '@/lib/blog';
import { SIZE_PRESETS_KB, sizeSlug } from '@/lib/compressSizes';

const BASE_URL = 'https://www.pdfadore.com';
// Bump when page content changes meaningfully; a per-request date tells crawlers everything changes daily.
const LAST_UPDATED = new Date('2026-10-25');

const STATIC_PAGES = ['/pricing', '/refund-policy', '/shipping-policy', '/all-tools', '/faq', '/about', '/contact', '/privacy', '/terms', '/deletion-policy'];

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        { url: BASE_URL, lastModified: LAST_UPDATED, changeFrequency: 'weekly', priority: 1 },
        ...ALL_TOOLS.map((tool) => ({
            url: `${BASE_URL}${tool.href}`,
            lastModified: LAST_UPDATED,
            changeFrequency: 'monthly' as const,
            priority: 0.8,
        })),
        ...TOOL_VARIANTS.map((variant) => ({
            url: `${BASE_URL}${variant.href}`,
            lastModified: LAST_UPDATED,
            changeFrequency: 'monthly' as const,
            priority: 0.7,
        })),
        ...SIZE_PRESETS_KB.map((kb) => ({
            url: `${BASE_URL}/compress-pdf-to-${sizeSlug(kb)}`,
            lastModified: LAST_UPDATED,
            changeFrequency: 'monthly' as const,
            priority: 0.7,
        })),
        { url: `${BASE_URL}/blog`, lastModified: LAST_UPDATED, changeFrequency: 'weekly' as const, priority: 0.6 },
        ...ARTICLES.map((article) => ({
            url: `${BASE_URL}/blog/${article.slug}`,
            lastModified: new Date(article.published),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
        })),
        ...STATIC_PAGES.map((path) => ({
            url: `${BASE_URL}${path}`,
            lastModified: LAST_UPDATED,
            changeFrequency: 'yearly' as const,
            priority: 0.3,
        })),
    ];
}
