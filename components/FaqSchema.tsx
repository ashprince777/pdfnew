import JsonLd from './JsonLd';
import { faqSchema } from '@/lib/seo';

type FaqItem = {
    question: string;
    answer: string;
};

/** FAQPage structured data built from the same questions shown on the page (invisible). */
export default function FaqSchema({ items }: { items: FaqItem[] }) {
    if (!items.length) return null;
    return <JsonLd data={faqSchema(items)} />;
}
