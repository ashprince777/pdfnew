"use client";
import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { getStoredTheme, setStoredTheme } from '@/lib/storage';

export default function ThemeToggle() {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedTheme = getStoredTheme();
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }, []);

    const toggleTheme = () => {
        const next = theme === 'light' ? 'dark' : 'light';
        setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
        setStoredTheme(next);
    };

    if (!mounted) {
        return (
            <div style={{ width: '44px', height: '44px' }} />
        );
    }

    return (
        <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                minWidth: '40px',
                minHeight: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-color)',
                transition: 'all 0.2s ease',
            }}
        >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} className="text-yellow-400" />}
        </button>
    );
}
