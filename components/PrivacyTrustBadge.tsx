"use client";
import React, { useState } from 'react';
import { ShieldCheck, Info, X } from 'lucide-react';

interface PrivacyTrustBadgeProps {
    variant?: 'compact' | 'prominent';
    className?: string;
}

export default function PrivacyTrustBadge({ variant = 'compact', className = '' }: PrivacyTrustBadgeProps) {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <div
                className={`privacy-trust-badge ${className}`}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: variant === 'prominent' ? '8px 16px' : '5px 12px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--primary-subtle)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-color)',
                    fontSize: variant === 'prominent' ? 'var(--text-sm)' : 'var(--text-xs)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.2s ease',
                }}
                onClick={() => setShowModal(true)}
                title="Learn why your files are 100% private"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setShowModal(true)}
            >
                <ShieldCheck size={variant === 'prominent' ? 18 : 15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span>
                    {variant === 'prominent'
                        ? '100% Client-Side Privacy — Your files never leave your device'
                        : '100% Private (No Uploads)'}
                </span>
                <Info size={14} style={{ color: 'var(--text-light)', opacity: 0.8 }} />
            </div>

            {/* Privacy Explanation Modal */}
            {showModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                    }}
                    onClick={() => setShowModal(false)}
                >
                    <div
                        style={{
                            background: 'var(--card-bg)',
                            color: 'var(--text-color)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius)',
                            boxShadow: 'var(--shadow-lg)',
                            maxWidth: '480px',
                            width: '100%',
                            padding: '24px',
                            position: 'relative',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowModal(false)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-light)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                            }}
                            aria-label="Close dialog"
                        >
                            <X size={20} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '50%',
                                    background: 'var(--primary-subtle)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--primary)',
                                }}
                            >
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>
                                    Your Privacy Is Guaranteed
                                </h3>
                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-light)', margin: 0 }}>
                                    Zero server processing for core operations
                                </p>
                            </div>
                        </div>

                        <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6, color: 'var(--text-light)', marginBottom: '16px' }}>
                            Unlike traditional online PDF converters that transmit your sensitive financial, personal, or corporate documents to external cloud servers, <strong>MyOnlinePDF processes your files directly inside your browser</strong> using WebAssembly and client-side memory buffers.
                        </p>

                        <ul style={{ fontSize: 'var(--text-xs)', color: 'var(--text-light)', paddingLeft: '20px', lineHeight: 1.8, marginBottom: '20px' }}>
                            <li><strong>No server file storage:</strong> Files never reach our backend.</li>
                            <li><strong>Instant execution:</strong> No waiting for uploads or cloud queues.</li>
                            <li><strong>Works offline:</strong> Core tool scripts run in memory once loaded.</li>
                        </ul>

                        <button
                            onClick={() => setShowModal(false)}
                            className="btn btn-primary"
                            style={{ width: '100%', minHeight: 'var(--touch-target-min)' }}
                        >
                            Got It, Keep My Files Safe
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
