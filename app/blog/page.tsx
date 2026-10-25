import type { Metadata } from 'next';
import Link from 'next/link';
import { ARTICLES } from '@/lib/blog';
import styles from './Blog.module.css';
import { breadcrumbSchema, blogSchema, pageMetadata } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = pageMetadata('/blog');

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

export default function BlogIndexPage() {
    return (
        <>
            <JsonLd data={[breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'PDF Guides', path: '/blog' }]), blogSchema()]} />
        <div className={`container ${styles.page}`}>
            <header className={styles.header}>
                <h1 className={styles.title}>PDF guides &amp; tips</h1>
                <p className={styles.subtitle}>Short, practical guides for the PDF jobs people do every day, from Aadhaar passwords to form size limits.</p>
            </header>
            <div className={styles.grid}>
                {ARTICLES.map((article) => (
                    <Link key={article.slug} href={`/blog/${article.slug}`} className={styles.card}>
                        <h2 className={styles.cardTitle}>{article.title}</h2>
                        <p className={styles.cardText}>{article.description}</p>
                        <p className={styles.meta}>{`${formatDate(article.published)} · ${article.readMinutes} min read`}</p>
                    </Link>
                ))}
            </div>
        </div>
        </>
    );
}
