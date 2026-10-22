import Link from 'next/link';
import PrivacyTrustBadge from '@/components/PrivacyTrustBadge';
import { ArrowRight } from 'lucide-react';
import { ALL_TOOLS } from '@/lib/tools';
import styles from './Hero.module.css';

export default function Hero() {
    return (
        <section className={styles.hero}>
            <div className="container text-center">
                <div style={{ marginBottom: '20px' }}>
                    <PrivacyTrustBadge variant="prominent" />
                </div>

                <h1 className={styles.title}>
                    Every PDF tool you&apos;ll <span className="text-gradient">adore</span>
                </h1>
                <p className={styles.subtitle}>
                    Merge, split, compress, convert, sign, edit and protect documents in seconds, right in your browser, with zero uploads.
                </p>

                <div className={styles.cta}>
                    <Link href="/all-tools" className="btn btn-primary btn-lg" style={{ gap: '8px', minHeight: 'var(--touch-target-min)' }}>
                        <span>Explore All {ALL_TOOLS.length} Tools</span>
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        </section>
    );
}
