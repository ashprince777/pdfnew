"use client";
import React, { useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ALL_TOOLS, POPULAR_TOOL_HREFS, ToolItem } from '@/lib/tools';
import { RECENT_TOOLS_KEY, getRecentToolHrefs } from '@/lib/storage';
import { Sparkles, Clock } from 'lucide-react';

function subscribeToStorage(onChange: () => void) {
    window.addEventListener('storage', onChange);
    return () => window.removeEventListener('storage', onChange);
}

export default function QuickAccessBar() {
    // Read localStorage only on the client; the server render shows the popular tools.
    const recentRaw = useSyncExternalStore(
        subscribeToStorage,
        () => {
            try {
                return localStorage.getItem(RECENT_TOOLS_KEY);
            } catch {
                return null;
            }
        },
        () => null
    );

    const { tools, isRecent } = useMemo(() => {
        const recent = recentRaw
            ? (getRecentToolHrefs().map((href) => ALL_TOOLS.find((t) => t.href === href)).filter(Boolean) as ToolItem[])
            : [];
        if (recent.length > 0) return { tools: recent, isRecent: true };
        const popular = POPULAR_TOOL_HREFS.map((href) => ALL_TOOLS.find((t) => t.href === href)).filter(Boolean) as ToolItem[];
        return { tools: popular, isRecent: false };
    }, [recentRaw]);

    if (tools.length === 0) return null;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                padding: '12px 16px',
                margin: '0 auto 24px',
                maxWidth: '900px',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-light)',
                    marginRight: '6px',
                }}
            >
                {isRecent ? (
                    <>
                        <Clock size={14} style={{ color: 'var(--accent)' }} />
                        <span>Recently Used:</span>
                    </>
                ) : (
                    <>
                        <Sparkles size={14} style={{ color: 'var(--primary)' }} />
                        <span>Popular Tools:</span>
                    </>
                )}
            </div>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    overflowX: 'auto',
                    maxWidth: '100%',
                    paddingBottom: '4px',
                    scrollbarWidth: 'none',
                }}
            >
                {tools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                        <Link
                            key={tool.href}
                            href={tool.href}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                minHeight: '36px',
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--card-surface)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-color)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 600,
                                textDecoration: 'none',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease',
                                boxShadow: 'var(--shadow-sm)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <span style={{ color: tool.color, display: 'flex', alignItems: 'center' }}>
                                <Icon size={14} />
                            </span>
                            <span>{tool.title}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
