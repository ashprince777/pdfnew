"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, Search, FileStack, Scissors, Minimize2 } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import CommandPalette from './CommandPalette';
import MobileDrawer from './MobileDrawer';
import styles from './Navbar.module.css';

export default function Navbar() {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsSearchOpen((prev) => !prev);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
        <>
            <nav className={`${styles.navbar} ${isScrolled ? styles.scrolled : ''}`}>
                <div className={`container ${styles.navContainer}`}>
                    {/* Brand */}
                    <Link href="/" className={styles.logo}>
                        <span className={styles.logoBadge}>PDF</span>
                        <span>Tools</span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className={styles.desktopMenu}>
                        <button
                            className={styles.searchTrigger}
                            onClick={() => setIsSearchOpen(true)}
                            aria-label="Search all PDF tools"
                        >
                            <Search size={14} style={{ color: 'var(--primary)' }} />
                            <span>Quick Search</span>
                            <span className={styles.searchKbd}>Ctrl+K</span>
                        </button>

                        <Link href="/merge-pdf" className={styles.navLink}>
                            <FileStack size={16} style={{ color: 'var(--cat-organize)' }} />
                            <span>Merge</span>
                        </Link>
                        <Link href="/split-pdf" className={styles.navLink}>
                            <Scissors size={16} style={{ color: 'var(--cat-organize)' }} />
                            <span>Split</span>
                        </Link>
                        <Link href="/compress-pdf" className={styles.navLink}>
                            <Minimize2 size={16} style={{ color: 'var(--cat-optimize)' }} />
                            <span>Compress</span>
                        </Link>

                        <Link href="/all-tools" className={styles.btnAll}>
                            All 22+ Tools
                        </Link>

                        <ThemeToggle />
                    </div>

                    {/* Mobile Controls */}
                    <div className={styles.mobileControls}>
                        <button
                            className={styles.mobileBtn}
                            onClick={() => setIsSearchOpen(true)}
                            aria-label="Search PDF tools"
                        >
                            <Search size={20} />
                        </button>

                        <ThemeToggle />

                        <button
                            className={styles.mobileBtn}
                            onClick={() => setIsDrawerOpen(true)}
                            aria-label="Open navigation menu"
                        >
                            <Menu size={22} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Command Palette / Search Dialog */}
            <CommandPalette
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
            />

            {/* Mobile Drawer Navigation */}
            <MobileDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onOpenSearch={() => setIsSearchOpen(true)}
            />
        </>
    );
}
