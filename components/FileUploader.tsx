"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Upload, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import PrivacyTrustBadge from '@/components/PrivacyTrustBadge';
import { addRecentToolHref } from '@/lib/storage';
import styles from './FileUploader.module.css';

interface FileUploaderProps {
    onFilesSelected: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
    maxFileSizeMB?: number;
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
    maxFileSizeMB = 100,
    toolName,
    variant = 'default',
}: FileUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragDepth = useRef(0);

    // Track recently used tool on mount
    useEffect(() => {
        addRecentToolHref(window.location.pathname);
    }, []);

    const allowedExtensions = accept
        .split(',')
        .map((ext) => ext.trim().toLowerCase().replace(/^\./, ''))
        .filter(Boolean);

    const validateFiles = (files: File[]): string | null => {
        if (files.length === 0) return 'No files were selected. Please select a valid file.';
        for (const file of files) {
            if (file.size / (1024 * 1024) > maxFileSizeMB) {
                return `File "${file.name}" exceeds the maximum size of ${maxFileSizeMB}MB for in-browser processing.`;
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

    const handleFiles = (list: FileList | null) => {
        if (!list || list.length === 0) return;
        const files = Array.from(list);
        const selected = multiple ? files : [files[0]];
        const error = validateFiles(selected);
        setErrorMessage(error);
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
                        {errorMessage}
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
                            File Validation Error
                        </h4>
                        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-color)', textAlign: 'center', lineHeight: 1.5 }}>
                            {errorMessage}
                        </p>
                        <button
                            type="button"
                            onClick={triggerFilePicker}
                            className="btn btn-primary"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                minHeight: 'var(--touch-target-min)',
                                marginTop: '8px',
                            }}
                        >
                            <RefreshCw size={16} />
                            <span>Select a Different File</span>
                        </button>
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
                            <span>Max {maxFileSizeMB}MB</span>
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
