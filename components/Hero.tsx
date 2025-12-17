import Link from 'next/link';
import styles from './Hero.module.css';

export default function Hero() {
    return (
        <section className={styles.hero}>
            <div className="container text-center">
                <h1 className={styles.title}>Every tool you need to work with PDFs</h1>
                <p className={styles.subtitle}>
                    Merge, split, compress, convert, rotate, unlock and watermark PDFs with just a few clicks.
                </p>
                <div className={styles.cta}>
                    {/* Note: In a real app this might open a file picker directly, 
              but for now it guides them to choose a tool */}
                    <Link href="/all-tools" className="btn btn-primary btn-lg">
                        Choose a Tool
                    </Link>
                </div>
            </div>
        </section>
    );
}
