"use client";
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Upload, AlertCircle, RefreshCw, Plus, Crown } from 'lucide-react';
import { usePlan, useToolLimits } from '@/components/PlanProvider';
import { getToolLimits } from '@/lib/plans';
import PrivacyTrustBadge from '@/components/PrivacyTrustBadge';
import { addRecentToolHref } from '@/lib/storage';
import { takeHandoff } from '@/lib/handoff';
import styles from './FileUploader.module.css';

interface FileUploaderProps {
    onFilesSelected: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
    /** Overrides the plan's size limit for this tool. */
    maxFileSizeMB?: number;
    /** Files already selected for this task (counts towards the plan's per-task limit). */
    currentCount?: number;
    /** What the user is choosing, e.g. "Word Document". Derived from `accept` when omitted. */
    toolName?: string;
    /** "compact" renders a single "Add more files" button for adding to an existing selection. */
    variant?: 'default' | 'compact';
}

function describeAccept(accept: string, multiple: boolean): string {
    const exts = accept.toLowerCase();
    let noun = 'File';
    if (exts.includes('.pdf')) noun = 'PDF File';
    else if (/\.(jpe?g|png|webp)/.test(exts)) noun = 'Image';
    else if (exts.includes('.doc')) noun = 'Word Document';
    else if (exts.includes('.ppt')) noun = 'PowerPoint File';
    else if (exts.includes('.xls')) noun = 'Excel File';
    else if (exts.includes('.htm')) noun = 'HTML File';
    return multiple ? `${noun}s` : noun;
}

export default function FileUploader({
    onFilesSelected,
    accept = '.pdf',
    multiple = false,
    maxFileSizeMB: maxFileSizeOverride,
    currentCount = 0,
    toolName,
    variant = 'default',
}: FileUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    /** Set when the error can be solved by upgrading. */
    const [upgradeHint, setUpgradeHint] = useState(false);
    const pathname = usePathname();
    const { billingEnabled } = usePlan();
    const limits = useToolLimits(pathname);
    const maxFileSizeMB = maxFileSizeOverride ?? limits.maxFileSizeMB;
    const maxFiles = multiple ? limits.maxFiles : 1;
    const canUpgrade = billingEnabled && limits.plan === 'free';
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragDepth = useRef(0);

    // Track recently used tool on mount
    useEffect(() => {
        addRecentToolHref(window.location.pathname);
    }, []);

    // "Continue with another tool": pick up the previous tool's result, if it was handed over.
    const handleFilesRef = useRef<(files: File[]) => void>(() => {});
    useEffect(() => {
        handleFilesRef.current = (files) => handleFiles(files);
    });
    useEffect(() => {
        if (variant === 'compact') return;
        // Claimed inside the timer so React's development double-mount can't lose the file.
        const timer = setTimeout(() => {
            const handoff = takeHandoff(accept);
            if (handoff) handleFilesRef.current([handoff.file]);
        }, 0);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
    }, []);

    const allowedExtensions = accept
        .split(',')
        .map((ext) => ext.trim().toLowerCase().replace(/^\./, ''))
        .filter(Boolean);

    const validateFiles = (files: File[]): string | null => {
        if (files.length === 0) return 'No files were selected. Please select a valid file.';
        if (currentCount + files.length > maxFiles) {
            return canUpgrade
                ? `The Free plan allows up to ${maxFiles} files per task. Premium allows up to ${getToolLimits(pathname, 'premium').maxFiles}.`
                : `You can add up to ${maxFiles} files per task.`;
        }
        for (const file of files) {
            if (file.size / (1024 * 1024) > maxFileSizeMB) {
                return canUpgrade
                    ? `"${file.name}" is larger than the Free plan limit of ${maxFileSizeMB} MB. Premium handles files up to ${getToolLimits(pathname, 'premium').maxFileSizeMB} MB.`
                    : `File "${file.name}" exceeds the maximum size of ${maxFileSizeMB}MB for in-browser processing.`;
            }
            if (file.size === 0) return `File "${file.name}" is empty.`;
            if (accept !== '*/*' && allowedExtensions.length > 0) {
                const ext = file.name.split('.').pop()?.toLowerCase();
                if (!ext || !allowedExtensions.includes(ext)) {
                    return `Invalid file format for "${file.name}". Please upload a supported file (${accept}).`;
                }
            }
        }
        return null;
    };

    const handleFiles = (list: FileList | File[] | null) => {
        if (!list || list.length === 0) return;
        const files = Array.from(list);
        const selected = multiple ? files : [files[0]];
        const error = validateFiles(selected);
        setErrorMessage(error);
        setUpgradeHint(Boolean(error) && canUpgrade && /Free plan/.test(error ?? ''));
        if (!error) onFilesSelected(selected);
    };

    const triggerFilePicker = () => {
        setErrorMessage(null);
        fileInputRef.current?.click();
    };

    const hiddenInput = (
        <input
            ref={fileInputRef}
            type="file"
            className={styles.hiddenInput}
            accept={accept}
            multiple={multiple}
            onChange={(e) => {
                handleFiles(e.target.files);
                // Allow picking the same file again after removing it.
                e.target.value = '';
            }}
            aria-hidden="true"
            tabIndex={-1}
        />
    );

    if (variant === 'compact') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <button type="button" className="btn btn-outline" onClick={triggerFilePicker} style={{ gap: 8 }}>
                    <Plus size={18} aria-hidden="true" /> Add more {describeAccept(accept, true).replace(/(Files|Images|Documents)/, (w) => w.toLowerCase())}
                </button>
                {errorMessage && (
                    <p role="alert" style={{ color: 'var(--error)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>
                        {errorMessage}{' '}
                        {upgradeHint && (
                            <Link href="/pricing" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline' }}>
                                Upgrade to Premium
                            </Link>
                        )}
                    </p>
                )}
                {hiddenInput}
            </div>
        );
    }

    const heading = `Choose ${toolName || describeAccept(accept, multiple)}`;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <PrivacyTrustBadge variant="prominent" />
            </div>

            {errorMessage ? (
                <div className={`${styles.uploader} ${styles.errorState}`} role="alert">
                    <div className={styles.errorBox}>
                        <div
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'rgba(239, 68, 68, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--error)',
                            }}
                        >
                            <AlertCircle size={28} />
                        </div>
                        <h4 style={{ margin: 0, fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--error)' }}>
                            {upgradeHint ? 'Free plan limit reached' : 'File Validation Error'}
                        </h4>
                        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-color)', textAlign: 'center', lineHeight: 1.5 }}>
                            {errorMessage}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 8 }}>
                            {upgradeHint && <Link href="/pricing" className="btn btn-primary" style={{ gap: 8, minHeight: 'var(--touch-target-min)' }}>
                            <Crown size={16} /> Upgrade to Premium
                        </Link>}
                            <button
                                type="button"
                                onClick={triggerFilePicker}
                                className={upgradeHint ? 'btn btn-outline' : 'btn btn-primary'}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: 'var(--touch-target-min)' }}
                            >
                                <RefreshCw size={16} />
                                <span>Select a Different File</span>
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    className={`${styles.uploader} ${isDragging ? styles.dragging : ''}`}
                    onDragEnter={(e) => {
                        e.preventDefault();
                        dragDepth.current++;
                        setIsDragging(true);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        // Child elements fire their own enter/leave events; only reset when leaving the zone.
                        dragDepth.current = Math.max(0, dragDepth.current - 1);
                        if (dragDepth.current === 0) setIsDragging(false);
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        dragDepth.current = 0;
                        setIsDragging(false);
                        handleFiles(e.dataTransfer.files);
                    }}
                    onClick={triggerFilePicker}
                >
                    <div className={styles.content}>
                        <div className={styles.iconWrapper}>
                            <Upload size={36} />
                        </div>

                        <h3 className={styles.title}>{heading}</h3>

                        <p className={styles.subtitle}>Drag and drop here, or tap to browse from your device</p>

                        <button
                            type="button"
                            className="btn btn-primary btn-lg"
                            style={{
                                minHeight: '48px',
                                padding: '12px 32px',
                                fontSize: 'var(--text-base)',
                                fontWeight: 700,
                                width: 'auto',
                                boxShadow: 'var(--shadow-md)',
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                triggerFilePicker();
                            }}
                        >
                            <span>Browse Files</span>
                        </button>

                        <div className={styles.hint}>
                            <span>Supported: {accept}</span>
                            <span>•</span>
                            <span>Max {maxFileSizeMB}MB{multiple ? `, ${maxFiles} files` : ''}</span>
                            <span>•</span>
                            <span>100% In-Browser</span>
                        </div>
                    </div>
                </div>
            )}

            {hiddenInput}
        </div>
    );
}
