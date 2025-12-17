import Link from 'next/link';
import { Apple, Play, Monitor, Twitter, Facebook, Linkedin, Instagram } from 'lucide-react'; // Placeholder icons
import styles from './Footer.module.css';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={`container ${styles.container}`}>
                <div className={styles.grid}>
                    {/* PRODUCT Column */}
                    <div className={styles.links}>
                        <h4>Product</h4>
                        <Link href="/">Home</Link>
                        <Link href="/all-tools">Features</Link>
                        <Link href="/pricing">Pricing</Link>
                        <Link href="/all-tools">Tools</Link>
                        <Link href="/faq">FAQ</Link>
                    </div>

                    {/* RESOURCES Column (Mapped to our tools/info) */}
                    <div className={styles.links}>
                        <h4>Resources</h4>
                        <Link href="/merge-pdf">Merge PDF</Link>
                        <Link href="/split-pdf">Split PDF</Link>
                        <Link href="/compress-pdf">Compress PDF</Link>
                        <Link href="/all-tools">PDF to Office</Link>
                        <Link href="/api-docs">Developer API</Link>
                    </div>

                    {/* SOLUTIONS Column (Placeholder links relevant to context) */}
                    <div className={styles.links}>
                        <h4>Solutions</h4>
                        <Link href="/business">Business</Link>
                        <Link href="/education">Education</Link>
                        <Link href="/mobile">Mobile App</Link>
                    </div>

                    {/* LEGAL Column */}
                    <div className={styles.links}>
                        <h4>Legal</h4>
                        <Link href="/deletion-policy">Security</Link>
                        <Link href="/privacy">Privacy Policy</Link>
                        <Link href="/terms">Terms & Conditions</Link>
                        <Link href="/cookies">Cookies</Link>
                    </div>

                    {/* COMPANY Column & Buttons */}
                    <div className={styles.storeColumn}>
                        <div className={styles.links} style={{ marginBottom: '20px' }}>
                            <h4>Company</h4>
                            <Link href="/about">About Us</Link>
                            <Link href="/contact">Contact Us</Link>
                        </div>

                        {/* Store Buttons (Visual only as per request "use only the menu we want") - Kept relevant if they have an app */}
                        <a href="#" className={styles.storeBtn}>
                            <Play size={24} className={styles.storeIcon} />
                            <div className={styles.storeText}>
                                <span className={styles.storeSmall}>GET IT ON</span>
                                <span className={styles.storeBig}>Google Play</span>
                            </div>
                        </a>
                        <a href="#" className={styles.storeBtn}>
                            <Apple size={24} className={styles.storeIcon} />
                            <div className={styles.storeText}>
                                <span className={styles.storeSmall}>Download on the</span>
                                <span className={styles.storeBig}>App Store</span>
                            </div>
                        </a>
                    </div>
                </div>

                <div className={styles.bottom}>
                    <div className={styles.socials}>
                        <Link href="#"><Twitter size={20} className={styles.socialIcon} /></Link>
                        <Link href="#"><Facebook size={20} className={styles.socialIcon} /></Link>
                        <Link href="#"><Linkedin size={20} className={styles.socialIcon} /></Link>
                        <Link href="#"><Instagram size={20} className={styles.socialIcon} /></Link>
                    </div>

                    <div className="text-center">
                        <p className="text-xs text-gray-500 mb-2 max-w-2xl mx-auto">
                            Advertising Disclosure: This site may use cookies and third-party advertising to support its free services.
                            We do not personally endorse any advertised products.
                        </p>
                        <p>&copy; {new Date().getFullYear()} MyOnlinePDF. All rights reserved. Your PDF Editor.</p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
