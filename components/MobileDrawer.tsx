"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ALL_TOOLS, CATEGORIES, ToolCategory } from '@/lib/tools';
import { X, Search, ChevronRight, Sparkles, Crown, UserRound } from 'lucide-react';
import { usePlan } from '@/components/PlanProvider';
import ThemeToggle from '@/components/ThemeToggle';

interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenSearch: () => void;
}

export default function MobileDrawer({ isOpen, onClose, onOpenSearch }: MobileDrawerProps) {
    const { authEnabled, billingEnabled, user } = usePlan();
    const [expandedCategory, setExpandedCategory] = useState<ToolCategory | 'all'>('organize');

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                document.body.style.overflow = '';
                window.removeEventListener('keydown', handleKeyDown);
            };
        } else {
            document.body.style.overflow = '';
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(4px)',
                zIndex: 9998,
                display: 'flex',
                justifyContent: 'flex-end',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '85%',
                    maxWidth: '360px',
                    height: '100%',
                    background: 'var(--card-bg)',
                    color: 'var(--text-color)',
                    borderLeft: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
                    paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 20px',
                        borderBottom: '1px solid var(--border-color)',
                    }}
                >
                    <div style={{ fontWeight: 800, fontSize: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>PDF Tools Menu</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ThemeToggle />
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                borderRadius: '50%',
                                width: '38px',
                                height: '38px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--text-color)',
                            }}
                            aria-label="Close menu"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Quick Search Button */}
                <div style={{ padding: '16px 20px 8px' }}>
                    <button
                        onClick={() => {
                            onClose();
                            onOpenSearch();
                        }}
                        style={{
                            width: '100%',
                            minHeight: 'var(--touch-target-min)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 16px',
                            borderRadius: 'var(--radius)',
                            background: 'var(--card-surface)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-light)',
                            fontSize: 'var(--text-sm)',
                            cursor: 'pointer',
                            textAlign: 'left',
                        }}
                    >
                        <Search size={16} style={{ color: 'var(--primary)' }} />
                        <span>Search all {ALL_TOOLS.length} tools...</span>
                    </button>
                </div>

                {/* Quick Link to All Tools */}
                <div style={{ padding: '4px 20px 12px' }}>
                    <Link
                        href="/all-tools"
                        onClick={onClose}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            minHeight: '44px',
                            padding: '0 16px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--primary-subtle)',
                            color: 'var(--primary)',
                            fontWeight: 700,
                            fontSize: 'var(--text-sm)',
                            textDecoration: 'none',
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Sparkles size={16} /> All PDF Tools Overview
                        </span>
                        <ChevronRight size={16} />
                    </Link>
                    {(billingEnabled || authEnabled) && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            {billingEnabled && (
                                <Link href="/pricing" onClick={onClose} className="btn btn-outline" style={{ flex: 1, gap: 6, padding: '8px 12px', fontSize: 'var(--text-sm)' }}>
                                    <Crown size={16} /> Pricing
                                </Link>
                            )}
                            {authEnabled && (
                                <Link href={user ? '/account' : '/login'} onClick={onClose} className="btn btn-outline" style={{ flex: 1, gap: 6, padding: '8px 12px', fontSize: 'var(--text-sm)' }}>
                                    <UserRound size={16} /> {user ? 'Account' : 'Log in'}
                                </Link>
                            )}
                        </div>
                    )}
                </div>

                {/* Categories Accordion List */}
                <div
                    style={{
                        overflowY: 'auto',
                        flex: 1,
                        padding: '0 20px',
                    }}
                >
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-light)', margin: '12px 0 8px' }}>
                        Browse by Category
                    </div>

                    {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
                        const isExpanded = expandedCategory === cat.id;
                        const categoryTools = ALL_TOOLS.filter((t) => t.category === cat.id);

                        return (
                            <div key={cat.id} style={{ marginBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                                <button
                                    onClick={() => setExpandedCategory(isExpanded ? 'all' : cat.id)}
                                    style={{
                                        width: '100%',
                                        minHeight: '48px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-color)',
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        padding: '12px 0',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span
                                            style={{
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '50%',
                                                backgroundColor: cat.color,
                                                display: 'inline-block',
                                            }}
                                        />
                                        <span>{cat.label}</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 400 }}>
                                            ({categoryTools.length})
                                        </span>
                                    </div>
                                    <ChevronRight
                                        size={16}
                                        style={{
                                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s ease',
                                            color: 'var(--text-light)',
                                        }}
                                    />
                                </button>

                                {isExpanded && (
                                    <div style={{ padding: '0 0 12px 18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {categoryTools.map((tool) => {
                                            const Icon = tool.icon;
                                            return (
                                                <Link
                                                    key={tool.href}
                                                    href={tool.href}
                                                    onClick={onClose}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        minHeight: '44px',
                                                        padding: '6px 12px',
                                                        borderRadius: 'var(--radius-sm)',
                                                        textDecoration: 'none',
                                                        color: 'var(--text-color)',
                                                        fontSize: 'var(--text-sm)',
                                                    }}
                                                >
                                                    <span style={{ color: tool.color, display: 'flex', alignItems: 'center' }}>
                                                        <Icon size={16} />
                                                    </span>
                                                    <span>{tool.title}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
