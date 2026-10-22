import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { SITE } from '@/lib/site';
import BrandLogo from './BrandLogo';
import styles from './Footer.module.css';

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
    {
        title: 'Organize',
        links: [
            { href: '/merge-pdf', label: 'Merge PDF' },
            { href: '/split-pdf', label: 'Split PDF' },
            { href: '/organize-pdf', label: 'Organize PDF' },
            { href: '/compress-pdf', label: 'Compress PDF' },
        ],
    },
    {
        title: 'Convert',
        links: [
            { href: '/pdf-to-word', label: 'PDF to Word' },
            { href: '/word-to-pdf', label: 'Word to PDF' },
            { href: '/jpg-to-pdf', label: 'JPG to PDF' },
            { href: '/pdf-to-jpg', label: 'PDF to JPG' },
        ],
    },
    {
        title: 'Edit & Secure',
        links: [
            { href: '/edit-pdf', label: 'Edit PDF' },
            { href: '/sign-pdf', label: 'Sign PDF' },
            { href: '/protect-pdf', label: 'Protect PDF' },
            { href: '/unlock-pdf', label: 'Unlock PDF' },
        ],
    },
    {
        title: 'Company',
        links: [
            { href: '/all-tools', label: 'All Tools' },
            { href: '/pricing', label: 'Pricing' },
            { href: '/about', label: 'About Us' },
            { href: '/faq', label: 'FAQ' },
            { href: '/contact', label: 'Contact Us' },
        ],
    },
    {
        title: 'Legal',
        links: [
            { href: '/privacy', label: 'Privacy Policy' },
            { href: '/terms', label: 'Terms & Conditions' },
            { href: '/refund-policy', label: 'Refund Policy' },
            { href: '/shipping-policy', label: 'Shipping & Delivery' },
            { href: '/deletion-policy', label: 'File Deletion Policy' },
        ],
    },
];

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={`container ${styles.container}`}>
                <div className={styles.brandRow}>
                    <Link href="/" aria-label={`${SITE.name} home`}>
                        <BrandLogo height={40} onDark />
                    </Link>
                    <p className={styles.tagline}>Free, private PDF tools you&apos;ll adore. Everything runs in your browser.</p>
                </div>
                <div className={styles.grid}>
                    {COLUMNS.map((column) => (
                        <nav key={column.title} className={styles.links} aria-label={column.title}>
                            <h4>{column.title}</h4>
                            {column.links.map((link) => (
                                <Link key={link.href} href={link.href}>
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                    ))}
                </div>

                <div className={styles.bottom}>
                    <p style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                        <ShieldCheck size={16} style={{ color: 'var(--success)' }} aria-hidden="true" />
                        Every PDF tool runs in your browser. Your files are never uploaded.
                    </p>
                    <p>{`© ${new Date().getFullYear()} ${SITE.name}, a ${SITE.legalName} brand. All rights reserved.`}</p>
                </div>
            </div>
        </footer>
    );
}
