import JsonLd from './JsonLd';
import { breadcrumbSchema } from '@/lib/seo';

type BreadcrumbItem = {
    name: string;
    /** Path on this site, e.g. "/merge-pdf". */
    item: string;
};

/** BreadcrumbList structured data (invisible). */
export default function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
    return <JsonLd data={breadcrumbSchema(items.map((i) => ({ name: i.name, path: i.item })))} />;
}
