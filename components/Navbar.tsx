"use client";
import Link from 'next/link';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import styles from './Navbar.module.css';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className={styles.navbar}>
            <div className={`container ${styles.navContainer}`}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.icon}>PDF</span>
                    Tools
                </Link>

                {/* Desktop Menu */}
                <div className={styles.desktopMenu}>
                    <Link href="/merge-pdf" className={styles.navLink}>Merge PDF</Link>
                    <Link href="/split-pdf" className={styles.navLink}>Split PDF</Link>
                    <Link href="/compress-pdf" className={styles.navLink}>Compress PDF</Link>
                    <div className={styles.dropdown}>
                        <button className={styles.navLink}>
                            Convert PDF <ChevronDown size={14} />
                        </button>
                        <div className={styles.dropdownContent}>
                            <Link href="/jpg-to-pdf">JPG to PDF</Link>
                            <Link href="/word-to-pdf">Word to PDF</Link>
                            <Link href="/powerpoint-to-pdf">PowerPoint to PDF</Link>
                            <Link href="/excel-to-pdf">Excel to PDF</Link>
                            <Link href="/html-to-pdf">HTML to PDF</Link>
                        </div>
                    </div>
                    <Link href="/all-tools" className={`${styles.navLink} ${styles.btnAll}`}>All PDF Tools</Link>
                </div>

                {/* Mobile Menu Button */}
                <button className={styles.mobileToggle} onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Mobile Menu */}
                {isOpen && (
                    <div className={styles.mobileMenu}>
                        <Link href="/merge-pdf" onClick={() => setIsOpen(false)}>Merge PDF</Link>
                        <Link href="/split-pdf" onClick={() => setIsOpen(false)}>Split PDF</Link>
                        <Link href="/compress-pdf" onClick={() => setIsOpen(false)}>Compress PDF</Link>
                        <div className={styles.mobileDivider}>Convert</div>
                        <Link href="/jpg-to-pdf" onClick={() => setIsOpen(false)}>JPG to PDF</Link>
                        <Link href="/word-to-pdf" onClick={() => setIsOpen(false)}>Word to PDF</Link>
                        <Link href="/all-tools" onClick={() => setIsOpen(false)}>All Tools</Link>
                    </div>
                )}
            </div>
        </nav>
    );
}
