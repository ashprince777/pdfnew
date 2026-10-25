"use client";
import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Download, CheckCircle, ArrowLeft, FileCheck, Eye, FileText, FileSpreadsheet, Presentation, Archive, FileImage, ArrowRight, Share2, AlertTriangle } from 'lucide-react';
import { formatBytes } from '@/lib/pdf';
import { setHandoff } from '@/lib/handoff';
import { ALL_TOOLS } from '@/lib/tools';
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
    txt: { label: 'Download Text File (.txt)', icon: FileText, tint: 'var(--cat-from-pdf)' },
    other: { label: 'Download File', icon: FileCheck, tint: 'var(--text-light)' },
} as const;

/** Built-in browsers of chat and social apps, which ignore downloads of files made in the page. */
const IN_APP_BROWSER = /WhatsApp|Instagram|FBAN|FBAV|FB_IAB|Snapchat|LinkedInApp|Line\/|MicroMessenger|; wv\)/i;

const MIME_TYPES: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    zip: 'application/zip',
    jpg: 'image/jpeg',
    png: 'image/png',
    txt: 'text/plain',
};

/** Tools offered after a PDF result, in order of how often they follow each other. */
const NEXT_TOOLS = ['/compress-pdf', '/protect-pdf', '/redact-pdf', '/sign-pdf', '/merge-pdf', '/watermark-pdf', '/add-page-numbers', '/edit-pdf', '/split-pdf', '/rotate-pdf', '/pdf-to-word'];
const MAX_NEXT_TOOLS = 6;

function kindForExtension(ext: string): keyof typeof FILE_KINDS {
    if (ext === 'pdf') return 'pdf';
    if (ext === 'docx' || ext === 'doc') return 'docx';
    if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
    if (ext === 'pptx' || ext === 'ppt') return 'pptx';
    if (ext === 'zip') return 'zip';
    if (ext === 'txt') return 'txt';
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

    const pathname = usePathname();
    const router = useRouter();
    const [handingOff, setHandingOff] = useState<string | null>(null);
    const nextTools = NEXT_TOOLS.filter((href) => href !== pathname)
        .slice(0, MAX_NEXT_TOOLS)
        .map((href) => ALL_TOOLS.find((t) => t.href === href))
        .filter((t): t is (typeof ALL_TOOLS)[number] => Boolean(t));

    // Phones: offer the system share sheet ("Save to Files", Drive, WhatsApp...), which also works where
    // downloads are blocked. The file is prepared up front because share() must run straight from the tap.
    const [shareFile, setShareFile] = useState<File | null>(null);
    // Only rendered after a file was processed in the browser, never on the server.
    const [inAppBrowser] = useState(() => typeof navigator !== 'undefined' && IN_APP_BROWSER.test(navigator.userAgent));
    useEffect(() => {
        let cancelled = false;
        if (!window.matchMedia('(pointer: coarse)').matches || typeof navigator.canShare !== 'function') return;
        fetch(downloadUrl)
            .then((res) => res.blob())
            .then((blob) => {
                const file = new File([blob], cleanFilename, { type: blob.type || MIME_TYPES[ext] || 'application/octet-stream' });
                if (!cancelled && navigator.canShare({ files: [file] })) setShareFile(file);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [downloadUrl, cleanFilename, ext]);

    const handleShare = () => {
        if (!shareFile) return;
        navigator.share({ files: [shareFile], title: cleanFilename }).catch(() => {
            // Closing the share sheet rejects too; nothing to do.
        });
    };

    const handlePreview = () => {
        window.open(downloadUrl, '_blank', 'noopener');
    };

    /** Passes this result to another tool in memory (no download, no upload). */
    const continueWith = async (href: string) => {
        setHandingOff(href);
        const blob = await (await fetch(downloadUrl)).blob();
        setHandoff(new File([blob], cleanFilename, { type: blob.type || 'application/pdf' }), pathname);
        router.push(href);
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

                {shareFile && (
                    <button type="button" onClick={handleShare} className={`btn btn-outline btn-lg ${styles.previewBtn}`}>
                        <Share2 size={20} aria-hidden="true" />
                        Share / Save to Files
                    </button>
                )}

                {ext === 'pdf' && !shareFile && (
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

            {inAppBrowser && (
                <p className={styles.inAppWarning} role="note">
                    <AlertTriangle size={18} aria-hidden="true" />
                    <span>
                        If the download does not start, this app&apos;s built-in browser is blocking it.{' '}
                        {shareFile ? 'Use Share / Save to Files above, or open' : 'Open'} this page in Chrome or Safari (tap the &#8942; or share
                        menu, then &quot;Open in browser&quot;) and run the tool again.
                    </span>
                </p>
            )}

            <p className={styles.note}>
                Your file was created in your browser and never left your device.
            </p>

            {ext === 'pdf' && nextTools.length > 0 && (
                <div className={styles.continue}>
                    <p className={styles.continueTitle}>Continue with this file</p>
                    <div className={styles.continueGrid}>
                        {nextTools.map((tool) => {
                            const Icon = tool.icon;
                            return (
                                <button key={tool.href} type="button" className={styles.continueBtn} onClick={() => continueWith(tool.href)} disabled={handingOff !== null}>
                                    <Icon size={16} style={{ color: tool.color }} aria-hidden="true" />
                                    <span>{handingOff === tool.href ? 'Opening...' : tool.title}</span>
                                    <ArrowRight size={14} aria-hidden="true" className={styles.continueArrow} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className={styles.actions}>
                <button type="button" onClick={onReset} className={styles.linkBtn}>
                    <ArrowLeft size={16} aria-hidden="true" /> Process another file
                </button>
            </div>
        </div>
    );
}
