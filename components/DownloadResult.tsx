"use client";
import React from 'react';
import { Download, CheckCircle, ArrowLeft, FileCheck, Eye, FileText, FileSpreadsheet, Presentation, Archive, FileImage } from 'lucide-react';
import { formatBytes } from '@/lib/pdf';
import styles from './DownloadResult.module.css';

interface DownloadResultProps {
    /** An object URL (blob:) created in the browser. Files never leave the device. */
    downloadUrl: string;
    downloadFilename: string;
    onReset: () => void;
    message?: string;
    fileSize?: number;
}

const FILE_KINDS = {
    pdf: { label: 'Download PDF', icon: FileText, tint: 'var(--cat-security)' },
    docx: { label: 'Download Word Document (.docx)', icon: FileText, tint: 'var(--cat-to-pdf)' },
    xlsx: { label: 'Download Excel (.xlsx)', icon: FileSpreadsheet, tint: 'var(--cat-optimize)' },
    pptx: { label: 'Download PowerPoint (.pptx)', icon: Presentation, tint: 'var(--warning)' },
    zip: { label: 'Download ZIP Archive (.zip)', icon: Archive, tint: 'var(--warning)' },
    image: { label: 'Download Image', icon: FileImage, tint: 'var(--cat-edit)' },
    other: { label: 'Download File', icon: FileCheck, tint: 'var(--text-light)' },
} as const;

function kindForExtension(ext: string): keyof typeof FILE_KINDS {
    if (ext === 'pdf') return 'pdf';
    if (ext === 'docx' || ext === 'doc') return 'docx';
    if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
    if (ext === 'pptx' || ext === 'ppt') return 'pptx';
    if (ext === 'zip') return 'zip';
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return 'image';
    return 'other';
}

export default function DownloadResult({
    downloadUrl,
    downloadFilename,
    onReset,
    message = 'Your file is ready!',
    fileSize,
}: DownloadResultProps) {
    const cleanFilename = downloadFilename?.trim() || 'downloaded_document.pdf';
    const ext = cleanFilename.split('.').pop()?.toLowerCase() || '';
    const kind = FILE_KINDS[kindForExtension(ext)];
    const KindIcon = kind.icon;

    const handlePreview = () => {
        window.open(downloadUrl, '_blank', 'noopener');
    };

    return (
        <div className={styles.container}>
            <CheckCircle size={64} className={styles.icon} aria-hidden="true" />
            <h2 className={styles.title}>{message}</h2>

            <div className={styles.fileCard}>
                <div className={styles.fileMeta}>
                    <div className={styles.fileIcon} style={{ color: kind.tint }}>
                        <KindIcon size={24} aria-hidden="true" />
                    </div>
                    <div className={styles.fileText}>
                        <p className={styles.fileName} title={cleanFilename}>
                            {cleanFilename}
                        </p>
                        <p className={styles.fileDetail}>
                            {ext ? `.${ext}` : 'file'}
                            {fileSize !== undefined && ` · ${formatBytes(fileSize)}`}
                        </p>
                    </div>
                </div>
                <span className={styles.readyBadge}>Ready</span>
            </div>

            <div className={styles.buttonRow}>
                <a
                    href={downloadUrl}
                    download={cleanFilename}
                    className={`btn btn-primary btn-lg ${styles.downloadBtn}`}
                >
                    <Download size={22} aria-hidden="true" />
                    {kind.label}
                </a>

                {ext === 'pdf' && (
                    <button
                        type="button"
                        onClick={handlePreview}
                        className={`btn btn-outline btn-lg ${styles.previewBtn}`}
                        title="Preview PDF in a new tab"
                    >
                        <Eye size={20} aria-hidden="true" />
                        Preview
                    </button>
                )}
            </div>

            <p className={styles.note}>
                Your file was created in your browser and never left your device.
            </p>

            <div className={styles.actions}>
                <button type="button" onClick={onReset} className={styles.linkBtn}>
                    <ArrowLeft size={16} aria-hidden="true" /> Process another file
                </button>
            </div>
        </div>
    );
}
