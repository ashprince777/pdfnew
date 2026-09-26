import React from 'react';
import Link from 'next/link';
import { LucideIcon, ShieldCheck, ArrowRight } from 'lucide-react';
import styles from './ToolCard.module.css';

interface ToolCardProps {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    color?: string;
}

export default function ToolCard({ title, description, href, icon: Icon, color = 'var(--primary)' }: ToolCardProps) {
    return (
        <Link href={href} className={styles.card}>
            <div className={styles.topRow}>
                <div className={styles.iconWrapper} style={{ color }}>
                    <Icon size={32} />
                </div>
                <span className={styles.privacyTag} title="Zero server uploads - processed inside your browser">
                    <ShieldCheck size={12} style={{ color: 'var(--success)' }} />
                    <span>In-Browser</span>
                </span>
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
