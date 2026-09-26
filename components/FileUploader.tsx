"use client";
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Upload, AlertCircle, RefreshCw } from 'lucide-react';
import PrivacyTrustBadge from '@/components/PrivacyTrustBadge';
import { addRecentToolHref } from '@/lib/storage';
import styles from './FileUploader.module.css';

interface FileUploaderProps {
    onFilesSelected: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
    maxFileSizeMB?: number;
    toolName?: string;
}

export default function FileUploader({
    onFilesSelected,
    accept = '.pdf',
    multiple = false,
    maxFileSizeMB = 100,
    toolName,
}: FileUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Track recently used tool on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            addRecentToolHref(window.location.pathname);
        }
    }, []);

    const validateFiles = (files: File[]): boolean => {
        setErrorMessage(null);

        if (files.length === 0) {
            setErrorMessage('No files were selected. Please select a valid file.');
            return false;
        }

        const allowedExtensions = accept
            .split(',')
            .map((ext) => ext.trim().toLowerCase().replace('.', ''));

        for (const file of files) {
            // Check size limit
            const sizeMB = file.size / (1024 * 1024);
            if (sizeMB > maxFileSizeMB) {
                setErrorMessage(
                    `File "${file.name}" exceeds the maximum recommended size of ${maxFileSizeMB}MB for in-browser processing.`
                );
                return false;
            }

            // Check file extension if accept specified
            if (accept && accept !== '*/*' && allowedExtensions.length > 0) {
                const ext = file.name.split('.').pop()?.toLowerCase();
                if (!ext || !allowedExtensions.includes(ext)) {
                    setErrorMessage(
                        `Invalid file format for "${file.name}". Please upload a supported file (${accept}).`
                    );
                    return false;
                }
            }
        }

        return true;
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);

            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const files = Array.from(e.dataTransfer.files);
                if (validateFiles(files)) {
                    onFilesSelected(multiple ? files : [files[0]]);
                }
            }
        },
        [multiple, onFilesSelected, accept, maxFileSizeMB]
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                const files = Array.from(e.target.files);
                if (validateFiles(files)) {
                    onFilesSelected(multiple ? files : [files[0]]);
                }
            }
        },
        [multiple, onFilesSelected, accept, maxFileSizeMB]
    );

    const triggerFilePicker = () => {
        setErrorMessage(null);
        fileInputRef.current?.click();
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto 40px' }}>
            {/* Prominent Privacy Assurance Header */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <PrivacyTrustBadge variant="prominent" />
            </div>

            {/* Error State with Recovery Action */}
            {errorMessage ? (
                <div className={`${styles.uploader} ${styles.errorState}`}>
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
                /* Standard Dual-Mode Upload Zone */
                <div
                    className={`${styles.uploader} ${isDragging ? styles.dragging : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerFilePicker}
                >
                    <div className={styles.content}>
                        <div className={styles.iconWrapper}>
                            <Upload size={36} />
                        </div>

                        <h3 className={styles.title}>
                            {multiple ? 'Choose PDF Files' : `Choose ${toolName || 'PDF File'}`}
                        </h3>

                        <p className={styles.subtitle}>
                            Drag and drop here, or tap to browse from your device
                        </p>

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

            <input
                ref={fileInputRef}
                type="file"
                className={styles.hiddenInput}
                accept={accept}
                multiple={multiple}
                onChange={handleFileInput}
            />
        </div>
    );
}
