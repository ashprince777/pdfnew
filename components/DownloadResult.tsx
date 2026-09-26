"use client";
import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, ArrowLeft, FileCheck, Eye, FileText, FileSpreadsheet, Presentation, Archive, FileImage } from 'lucide-react';
import styles from './DownloadResult.module.css';

interface DownloadResultProps {
    downloadUrl: string;
    downloadFilename: string;
    onReset: () => void;
    message?: string;
}

export default function DownloadResult({
    downloadUrl,
    downloadFilename,
    onReset,
    message = 'Your file is ready!'
}: DownloadResultProps) {
    const [downloading, setDownloading] = useState(false);
    const [serverDownloadUrl, setServerDownloadUrl] = useState<string | null>(null);

    // Sanitize and ensure proper filename with extension
    const cleanFilename = downloadFilename?.trim() || 'downloaded_document.pdf';

    // Pre-register with server-side download API to guarantee Content-Disposition headers
    useEffect(() => {
        let isMounted = true;
        async function registerServerDownload() {
            try {
                const blobRes = await fetch(downloadUrl);
                const blob = await blobRes.blob();
                const formData = new FormData();
                formData.append('file', blob, cleanFilename);
                formData.append('filename', cleanFilename);
                formData.append('mimeType', blob.type || 'application/pdf');

                const apiRes = await fetch('/api/download', {
                    method: 'POST',
                    body: formData,
                });
                if (apiRes.ok && isMounted) {
                    const data = await apiRes.json();
                    if (data.downloadUrl) {
                        setServerDownloadUrl(data.downloadUrl);
                    }
                }
            } catch (err) {
                console.warn('Pre-registration of server download URL skipped:', err);
            }
        }
        registerServerDownload();
        return () => { isMounted = false; };
    }, [downloadUrl, cleanFilename]);

    // Determine file type from extension
    const ext = cleanFilename.split('.').pop()?.toLowerCase() || '';
    const isPdf = ext === 'pdf';
    const isDocx = ext === 'docx' || ext === 'doc';
    const isExcel = ext === 'xlsx' || ext === 'xls';
    const isPptx = ext === 'pptx' || ext === 'ppt';
    const isZip = ext === 'zip';
    const isImage = ext === 'jpg' || ext === 'jpeg' || ext === 'png';

    // Format download button label
    let buttonLabel = 'Download File';
    if (isPdf) buttonLabel = 'Download PDF';
    else if (isDocx) buttonLabel = 'Download Word Document (.docx)';
    else if (isExcel) buttonLabel = 'Download Excel (.xlsx)';
    else if (isPptx) buttonLabel = 'Download PowerPoint (.pptx)';
    else if (isZip) buttonLabel = 'Download ZIP Archive (.zip)';
    else if (isImage) buttonLabel = 'Download Image';

    const handleDownloadClick = async (e: React.MouseEvent) => {
        if (serverDownloadUrl) {
            // Server URL with Content-Disposition is already prepared; native anchor handles it
            return;
        }

        e.preventDefault();
        if (downloading) return;
        setDownloading(true);

        try {
            // Fetch the blob from downloadUrl
            const blobRes = await fetch(downloadUrl);
            const blob = await blobRes.blob();

            // POST to /api/download to generate a real HTTP download URL with Content-Disposition
            const formData = new FormData();
            formData.append('file', blob, cleanFilename);
            formData.append('filename', cleanFilename);
            formData.append('mimeType', blob.type || 'application/pdf');

            const apiRes = await fetch('/api/download', {
                method: 'POST',
                body: formData,
            });

            if (apiRes.ok) {
                const data = await apiRes.json();
                if (data.downloadUrl) {
                    setServerDownloadUrl(data.downloadUrl);
                    window.location.assign(data.downloadUrl);
                    return;
                }
            }
        } catch (err) {
            console.warn('Server download route failed, using local anchor fallback:', err);
        } finally {
            setTimeout(() => setDownloading(false), 1200);
        }

        // Direct fallback
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = downloadUrl;
        a.setAttribute('download', cleanFilename);
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            if (document.body.contains(a)) document.body.removeChild(a);
        }, 1000);
    };

    const handlePreview = (e: React.MouseEvent) => {
        e.preventDefault();
        window.open(downloadUrl, '_blank');
    };

    return (
        <div className={styles.container}>
            <CheckCircle size={64} className={styles.icon} />
            <h2 className={styles.title}>{message}</h2>

            {/* Result File Details Card */}
            {cleanFilename && (
                <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`p-2.5 rounded-lg ${
                            isPdf ? 'bg-red-100 text-red-600' :
                            isDocx ? 'bg-blue-100 text-blue-600' :
                            isExcel ? 'bg-green-100 text-green-700' :
                            isPptx ? 'bg-orange-100 text-orange-600' :
                            isZip ? 'bg-amber-100 text-amber-600' :
                            'bg-gray-100 text-gray-600'
                        }`}>
                            {isPdf && <FileText size={24} />}
                            {isDocx && <FileText size={24} />}
                            {isExcel && <FileSpreadsheet size={24} />}
                            {isPptx && <Presentation size={24} />}
                            {isZip && <Archive size={24} />}
                            {isImage && <FileImage size={24} />}
                            {!isPdf && !isDocx && !isExcel && !isPptx && !isZip && !isImage && <FileCheck size={24} />}
                        </div>
                        <div className="text-left overflow-hidden">
                            <p className="font-semibold text-gray-900 truncate text-sm md:text-base" title={cleanFilename}>
                                {cleanFilename}
                            </p>
                            <p className="text-xs text-gray-500 uppercase font-mono tracking-wider">
                                {ext ? `.${ext}` : 'Ready for download'}
                            </p>
                        </div>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                        Ready
                    </span>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md justify-center mb-6">
                <a
                    href={serverDownloadUrl || downloadUrl}
                    download={cleanFilename}
                    onClick={handleDownloadClick}
                    className={`btn btn-primary btn-lg ${styles.downloadBtn}`}
                    style={{
                        textDecoration: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                    }}
                >
                    <Download size={22} />
                    {downloading ? 'Downloading...' : buttonLabel}
                </a>

                {isPdf && (
                    <button
                        type="button"
                        onClick={handlePreview}
                        className="btn btn-outline btn-lg"
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        title="Preview PDF in a new tab"
                    >
                        <Eye size={20} />
                        Preview
                    </button>
                )}
            </div>

            <p className={styles.note}>
                Your files are processed securely in your browser and never leave your device.
            </p>

            <div className={styles.actions}>
                <button onClick={onReset} className={styles.linkBtn}>
                    <ArrowLeft size={16} /> Process another file
                </button>
            </div>
        </div>
    );
}
