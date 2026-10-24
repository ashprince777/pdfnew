import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import { ARTICLES, getArticle, type Block } from '@/lib/blog';
import { SITE } from '@/lib/site';
import styles from '../Blog.module.css';

export const dynamicParams = false;

export function generateStaticParams() {
    return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const article = getArticle((await params).slug);
    if (!article) return {};
    return {
        title: article.title,
        description: article.description,
        alternates: { canonical: `/blog/${article.slug}` },
        openGraph: { type: 'article', title: article.title, description: article.description, publishedTime: article.published },
    };
}

function renderBlock(block: Block, i: number) {
    switch (block.type) {
        case 'h2':
            return <h2 key={i}>{block.text}</h2>;
        case 'p':
            return <p key={i}>{block.text}</p>;
        case 'ul':
            return <ul key={i}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
        case 'ol':
            return <ol key={i}>{block.items.map((item) => <li key={item}>{item}</li>)}</ol>;
        case 'tip':
            return <p key={i} className={styles.tip}><strong>Tip:</strong> {block.text}</p>;
        case 'table':
            return (
                <div key={i} className={styles.tableWrap}>
                    <table>
                        <thead><tr>{block.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                        <tbody>{block.rows.map((row) => <tr key={row[0]}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
                    </table>
                </div>
            );
        case 'cta':
            return (
                <div key={i} className={styles.cta}>
                    <p>{block.text}</p>
                    <Link href={block.href} className="btn btn-primary" style={{ gap: 8 }}>
                        {block.label} <ArrowRight size={18} />
                    </Link>
                </div>
            );
    }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const article = getArticle((await params).slug);
    if (!article) notFound();
    const related = ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 3);
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.description,
        datePublished: article.published,
        dateModified: article.published,
        author: { '@type': 'Organization', name: SITE.name, url: SITE.url },
        publisher: { '@type': 'Organization', name: SITE.name, logo: { '@type': 'ImageObject', url: `${SITE.url}/brand/pdfadore-icon-512.png` } },
        mainEntityOfPage: `${SITE.url}/blog/${article.slug}`,
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <BreadcrumbSchema items={[{ name: 'Home', item: '/' }, { name: 'Blog', item: '/blog' }, { name: article.title, item: `/blog/${article.slug}` }]} />
            {article.faq.length > 0 && <FaqSchema items={article.faq} />}

            <article className={`container ${styles.article}`}>
                <p className={styles.breadcrumb}><Link href="/blog">PDF guides</Link></p>
                <h1 className={styles.articleTitle}>{article.title}</h1>
                <p className={styles.meta}>
                    {`${new Date(article.published).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · ${article.readMinutes} min read`}
                </p>
                <div className={styles.body}>
                    {article.blocks.map(renderBlock)}
                    {article.faq.length > 0 && (
                        <>
                            <h2>Frequently asked questions</h2>
                            {article.faq.map((item) => (
                                <div key={item.question}>
                                    <h3>{item.question}</h3>
                                    <p>{item.answer}</p>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                <aside className={styles.related}>
                    <h2>More guides</h2>
                    <div className={styles.grid}>
                        {related.map((a) => (
                            <Link key={a.slug} href={`/blog/${a.slug}`} className={styles.card}>
                                <h3 className={styles.cardTitle}>{a.title}</h3>
                            </Link>
                        ))}
                    </div>
                </aside>
            </article>
        </>
    );
}
