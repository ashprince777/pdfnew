import type { Metadata } from 'next';
import ToolCard from '@/components/ToolCard';
import PrivacyTrustBadge from '@/components/PrivacyTrustBadge';
import { ALL_TOOLS, CATEGORIES } from '@/lib/tools';
import styles from '../page.module.css';

export const metadata: Metadata = {
    title: 'All PDF Tools',
    description: 'Every free PDFAdore tool in one place: merge, split, compress, convert, edit, sign and secure PDFs in your browser.',
    alternates: {
        canonical: '/all-tools',
    },
};

export default function AllToolsPage() {
    return (
        <div className="container" style={{ padding: '40px 16px 80px' }}>
            <div className="text-center mb-10">
                <div style={{ marginBottom: '16px' }}>
                    <PrivacyTrustBadge variant="prominent" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mb-3">All PDF Tools</h1>
                <p className="text-muted text-base md:text-lg max-w-2xl mx-auto">
                    A comprehensive suite of free, private, client-side tools to handle every PDF task with ease.
                </p>
            </div>

            {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
                const categoryTools = ALL_TOOLS.filter((t) => t.category === cat.id);
                if (categoryTools.length === 0) return null;

                return (
                    <div key={cat.id} className="mb-12">
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '20px',
                                paddingBottom: '8px',
                                borderBottom: '1px solid var(--border-color)',
                            }}
                        >
                            <span
                                style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    backgroundColor: cat.color,
                                    display: 'inline-block',
                                }}
                            />
                            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, margin: 0, color: 'var(--text-color)' }}>
                                {cat.label}
                            </h2>
                            <span
                                style={{
                                    fontSize: 'var(--text-xs)',
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-light)',
                                    padding: '2px 8px',
                                    borderRadius: 'var(--radius-full)',
                                    fontWeight: 600,
                                }}
                            >
                                {categoryTools.length} {categoryTools.length === 1 ? 'tool' : 'tools'}
                            </span>
                        </div>
                        <div className={styles.grid}>
                            {categoryTools.map((tool) => (
                                <ToolCard key={tool.href} {...tool} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
