import React from 'react';
import Link from 'next/link';
import { LucideIcon, ShieldCheck, ArrowRight, Crown, UserRound } from 'lucide-react';
import styles from './ToolCard.module.css';

interface ToolCardProps {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    color?: string;
    /** Premium-only tools and tools that need a (free) account are labelled before people upload. */
    access?: 'premium' | 'account';
}

export default function ToolCard({ title, description, href, icon: Icon, color = 'var(--primary)', access }: ToolCardProps) {
    return (
        <Link href={href} className={styles.card}>
            <div className={styles.topRow}>
                <div className={styles.iconWrapper} style={{ color }}>
                    <Icon size={32} />
                </div>
                {access === 'premium' ? (
                    <span className={`${styles.privacyTag} ${styles.premiumTag}`} title="Included with PDFAdore Premium">
                        <Crown size={12} aria-hidden="true" />
                        <span>Premium</span>
                    </span>
                ) : access === 'account' ? (
                    // AI tools send the document's text to our AI provider, so they are not labelled "In-Browser".
                    <span className={styles.privacyTag} title="Needs a free account. Includes 3 AI credits a month.">
                        <UserRound size={12} aria-hidden="true" />
                        <span>Free account</span>
                    </span>
                ) : (
                    <span className={styles.privacyTag} title="Zero server uploads - processed inside your browser">
                        <ShieldCheck size={12} style={{ color: 'var(--success)' }} aria-hidden="true" />
                        <span>In-Browser</span>
                    </span>
                )}
            </div>

            <div className={styles.content}>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.description}>{description}</p>
            </div>

            <div className={styles.actionRow}>
                <span className={styles.actionText}>Use Tool</span>
                <ArrowRight size={14} className={styles.actionIcon} />
            </div>
        </Link>
    );
}
