import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
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
            <div className={styles.iconWrapper} style={{ color }}>
                <Icon size={40} />
            </div>
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.description}>{description}</p>
        </Link>
    );
}
