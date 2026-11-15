"use client";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { ALL_TOOLS, CATEGORIES } from '@/lib/tools';
import styles from './Navbar.module.css';

/** Shortcuts for the most common form-upload jobs, shown as their own column. */
const FORM_LINKS = [
    { title: 'Compress PDF to 200 KB', href: '/compress-pdf-to-200kb' },
    { title: 'Compress PDF to 100 KB', href: '/compress-pdf-to-100kb' },
    { title: 'Resize image to 20 KB', href: '/resize-image-to-20kb' },
    { title: 'Resize image to 50 KB', href: '/resize-image-to-50kb' },
    { title: 'JPG to PDF under 100 KB', href: '/jpg-to-pdf-under-100kb' },
    { title: 'Kerala PSC photo & signature', href: '/kerala-psc-photo-signature-resize' },
    { title: 'SSC signature', href: '/ssc-signature-resize' },
];

/** "All tools" button in the top bar that opens a menu of every tool, grouped by category. */
export default function ToolsMenu() {
    const [open, setOpen] = useState(false);
    const [lastPath, setLastPath] = useState('');
    const wrapper = useRef<HTMLDivElement>(null);
    /** True while a mouse is over the menu: it is then already open, so a click must not close it. */
    const hovering = useRef(false);
    const pathname = usePathname();

    // Close after moving to another page.
    if (pathname !== lastPath) {
        setLastPath(pathname);
        setOpen(false);
    }

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        const onClick = (e: MouseEvent) => !wrapper.current?.contains(e.target as Node) && setOpen(false);
        document.addEventListener('keydown', onKey);
        document.addEventListener('click', onClick);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('click', onClick);
        };
    }, [open]);

    return (
        <div ref={wrapper} className={styles.toolsMenu}
            onPointerEnter={(e) => {
                if (e.pointerType !== 'mouse') return;
                hovering.current = true;
                setOpen(true);
            }}
            onPointerLeave={(e) => {
                if (e.pointerType !== 'mouse') return;
                hovering.current = false;
                setOpen(false);
            }}
        >
            <button type="button" className={styles.btnAll} aria-expanded={open} aria-haspopup="true" aria-controls="tools-menu-panel" onClick={() => setOpen((v) => hovering.current || !v)}>
                All {ALL_TOOLS.length} Tools <ChevronDown size={14} aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s ease' }} />
            </button>

            {open && (
                <div id="tools-menu-panel" className={styles.toolsPanel}>
                    <div className={styles.toolsGrid}>
                        {CATEGORIES.filter((c) => c.id !== 'all').map((category) => (
                            <div key={category.id}>
                                <p className={styles.toolsHeading} style={{ color: category.color }}>{category.label}</p>
                                {ALL_TOOLS.filter((t) => t.category === category.id).map((tool) => (
                                    <Link key={tool.href} href={tool.href} className={styles.toolsLink}>
                                        <tool.icon size={15} aria-hidden="true" style={{ color: tool.color, flex: 'none' }} />
                                        {tool.title}
                                    </Link>
                                ))}
                            </div>
                        ))}
                        <div>
                            <p className={styles.toolsHeading}>For application forms</p>
                            {FORM_LINKS.map((link) => (
                                <Link key={link.href} href={link.href} className={styles.toolsLink}>
                                    {link.title}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <Link href="/all-tools" className={styles.toolsAll}>
                        View all tools →
                    </Link>
                </div>
            )}
        </div>
    );
}
