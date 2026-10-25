"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ALL_TOOLS, TOOL_VARIANTS } from '@/lib/tools';

const MAX_LINKS = 6;

/**
 * Links to closely related tools: format variants of this tool first, then tools in the same category.
 * Helps visitors find the next step and gives search engines a clear internal link structure.
 */
export default function RelatedTools() {
    const pathname = usePathname();
    const variant = TOOL_VARIANTS.find((v) => v.href === pathname);
    const base = variant ? variant.parent : pathname;
    const current = ALL_TOOLS.find((t) => t.href === base);
    if (!current) return null;

    const links: { title: string; href: string }[] = [];
    const add = (title: string, href: string) => {
        if (href !== pathname && !links.some((l) => l.href === href)) links.push({ title, href });
    };
    if (variant) add(current.title, current.href);
    TOOL_VARIANTS.filter((v) => v.parent === base).forEach((v) => add(v.title, v.href));
    ALL_TOOLS.filter((t) => t.category === current.category).forEach((t) => add(t.title, t.href));
    if (!links.length) return null;

    return (
        <>
            <h2 className="text-2xl font-semibold mb-4 mt-10 text-gray-800">Related Tools</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {links.slice(0, MAX_LINKS).map((l) => (
                    <Link key={l.href} href={l.href} className="block p-4 border rounded hover:border-red-500 hover:text-red-600 transition-colors text-center font-medium">
                        {l.title} &rarr;
                    </Link>
                ))}
            </div>
        </>
    );
}
