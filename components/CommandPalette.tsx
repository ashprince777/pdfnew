"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_TOOLS, CATEGORIES } from '@/lib/tools';
import { Search, X, ArrowRight } from 'lucide-react';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const [wasOpen, setWasOpen] = useState(isOpen);

    // Start from a clean search every time the palette opens.
    if (isOpen !== wasOpen) {
        setWasOpen(isOpen);
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
        }
    }

    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => inputRef.current?.focus(), 50);
        return () => clearTimeout(timer);
    }, [isOpen]);

    const filteredTools = ALL_TOOLS.filter((tool) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
            tool.title.toLowerCase().includes(q) ||
            tool.description.toLowerCase().includes(q) ||
            tool.category.toLowerCase().includes(q)
        );
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredTools.length));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + filteredTools.length) % Math.max(1, filteredTools.length));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredTools[selectedIndex]) {
                    router.push(filteredTools[selectedIndex].href);
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredTools, selectedIndex, router, onClose]);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Search PDF tools"
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(6px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '80px 16px 20px',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--card-bg)',
                    color: 'var(--text-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius)',
                    boxShadow: 'var(--shadow-lg)',
                    maxWidth: '600px',
                    width: '100%',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: 'calc(100vh - 120px)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Bar */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border-color)',
                    }}
                >
                    <Search size={20} style={{ color: 'var(--text-light)', flexShrink: 0 }} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        placeholder="Search any tool (e.g. Merge, Compress, Word, Sign)..."
                        aria-label="Search tools input"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontSize: 'var(--text-base)',
                            color: 'var(--text-color)',
                            width: '100%',
                            fontFamily: 'inherit',
                        }}
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            aria-label="Clear search input"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-light)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <X size={16} />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        aria-label="Close search dialog"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-light)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px',
                        }}
                    >
                        <X size={18} />
                    </button>
                    <span
                        style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-light)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            userSelect: 'none',
                        }}
                    >
                        ESC
                    </span>
                </div>

                {/* Results List */}
                <div
                    style={{
                        overflowY: 'auto',
                        padding: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                    }}
                >
                    {filteredTools.length === 0 ? (
                        <div
                            style={{
                                padding: '32px 16px',
                                textAlign: 'center',
                                color: 'var(--text-light)',
                                fontSize: 'var(--text-sm)',
                            }}
                        >
                            No PDF tools found matching &quot;{query}&quot;.
                        </div>
                    ) : (
                        filteredTools.map((tool, idx) => {
                            const Icon = tool.icon;
                            const isSelected = idx === selectedIndex;
                            const cat = CATEGORIES.find((c) => c.id === tool.category);

                            return (
                                <div
                                    key={tool.href}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 16px',
                                        minHeight: 'var(--touch-target-min)',
                                        borderRadius: 'var(--radius-sm)',
                                        background: isSelected ? 'var(--primary-subtle)' : 'transparent',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s ease',
                                    }}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    onClick={() => {
                                        router.push(tool.href);
                                        onClose();
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div
                                            style={{
                                                color: tool.color,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '6px',
                                                background: 'var(--card-bg)',
                                                border: '1px solid var(--border-color)',
                                            }}
                                        >
                                            <Icon size={18} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                                                {tool.title}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 'var(--text-xs)',
                                                    color: 'var(--text-light)',
                                                }}
                                            >
                                                {tool.description}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {cat && (
                                            <span
                                                style={{
                                                    fontSize: '11px',
                                                    padding: '2px 8px',
                                                    borderRadius: 'var(--radius-full)',
                                                    border: '1px solid var(--border-color)',
                                                    color: 'var(--text-light)',
                                                }}
                                            >
                                                {cat.label}
                                            </span>
                                        )}
                                        <ArrowRight
                                            size={14}
                                            style={{
                                                color: isSelected ? 'var(--primary)' : 'var(--text-light)',
                                                opacity: isSelected ? 1 : 0.4,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
