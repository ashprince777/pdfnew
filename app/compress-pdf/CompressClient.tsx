"use client";
import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { Minimize2, FileText, ArrowRight } from 'lucide-react';
import styles from './page.module.css';

export default function CompressClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [fileSizeInfo, setFileSizeInfo] = useState<{ original: number, new: number } | null>(null);
    const [quality, setQuality] = useState<'recommended' | 'extreme'>('recommended');

    const handleFilesSelected = (files: File[]) => {
        if (files.length > 0) setFile(files[0]);
    };

    const compressPdf = async () => {
        if (!file) return;
        setStatus('PROCESSING');

        try {
            const arrayBuffer = await file.arrayBuffer();

            // Use pdfjs-dist to render pages at reduced quality, then rebuild the PDF
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const srcDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const totalPages = srcDoc.numPages;

            const newPdf = await PDFDocument.create();

            // Scale and JPEG quality based on compression level
            const scale = quality === 'extreme' ? 1.0 : 1.5;
            const jpegQuality = quality === 'extreme' ? 0.5 : 0.72;

            for (let i = 1; i <= totalPages; i++) {
                const page = await srcDoc.getPage(i);
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (context) {
                    await (page.render({ canvasContext: context, viewport } as any).promise);

                    // Convert to JPEG with reduced quality
                    const jpegDataUrl = canvas.toDataURL('image/jpeg', jpegQuality);

                    // Embed the JPEG image into a new PDF page
                    const jpegImage = await newPdf.embedJpg(
                        await fetch(jpegDataUrl).then(r => r.arrayBuffer())
                    );

                    // Get original page dimensions for the output
                    const origViewport = page.getViewport({ scale: 1.0 });
                    const pdfPage = newPdf.addPage([origViewport.width, origViewport.height]);
                    pdfPage.drawImage(jpegImage, {
                        x: 0,
                        y: 0,
                        width: origViewport.width,
                        height: origViewport.height,
                    });
                }
            }

            const pdfBytes = await newPdf.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

            if (downloadUrl) URL.revokeObjectURL(downloadUrl);

            const url = URL.createObjectURL(blob);

            setFileSizeInfo({
                original: file.size,
                new: blob.size
            });
            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error) {
            console.error('Error compressing PDF:', error);
            alert('An error occurred while compressing. Please try again.');
            setStatus('IDLE');
        }
    };

    const reset = () => {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setFile(null);
        setStatus('IDLE');
        setDownloadUrl(null);
        setFileSizeInfo(null);
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1>Compress PDF File</h1>
                <p className="text-muted">Reduce the file size of your PDF while maintaining quality.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} />
            )}

            {status === 'IDLE' && file && (
                <div className={styles.workspace}>
                    <div className={styles.fileItem}>
                        <div className={styles.fileInfo}>
                            <FileText className={styles.fileIcon} />
                            <span className={styles.fileName}>{file.name}</span>
                            <span className={styles.fileSize}>{formatSize(file.size)}</span>
                        </div>
                        <button onClick={reset} className={styles.removeBtn}>Change</button>
                    </div>

                    <div style={{ margin: '20px 0', padding: '16px', background: 'var(--card-surface)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        <h3 style={{ marginBottom: '12px', fontSize: '1rem', color: 'var(--text-color)' }}>Compression Level</h3>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 16px', border: quality === 'recommended' ? '2px solid var(--primary)' : '2px solid var(--border-color)', background: 'var(--card-bg)', borderRadius: '8px', flex: 1 }}>
                                <input
                                    type="radio"
                                    name="quality"
                                    checked={quality === 'recommended'}
                                    onChange={() => setQuality('recommended')}
                                />
                                <div>
                                    <strong>Recommended</strong>
                                    <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-light)' }}>Good balance of quality and size</p>
                                </div>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 16px', border: quality === 'extreme' ? '2px solid var(--primary)' : '2px solid var(--border-color)', background: 'var(--card-bg)', borderRadius: '8px', flex: 1 }}>
                                <input
                                    type="radio"
                                    name="quality"
                                    checked={quality === 'extreme'}
                                    onChange={() => setQuality('extreme')}
                                />
                                <div>
                                    <strong>Extreme</strong>
                                    <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-light)' }}>Smallest file, lower quality</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className={styles.bottomBar}>
                        <button onClick={compressPdf} className="btn btn-primary btn-lg">
                            Compress PDF <ArrowRight size={20} style={{ marginLeft: '10px' }} />
                        </button>
                    </div>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Compressing PDF (this may take a moment)..." />}

            {status === 'DONE' && downloadUrl && fileSizeInfo && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={`compressed_${file?.name}`}
                    onReset={reset}
                    message={
                        fileSizeInfo.new < fileSizeInfo.original
                            ? `Compressed! ${formatSize(fileSizeInfo.original)} → ${formatSize(fileSizeInfo.new)} (${(100 - (fileSizeInfo.new / fileSizeInfo.original * 100)).toFixed(0)}% smaller)`
                            : `File optimized: ${formatSize(fileSizeInfo.new)}`
                    }
                />
            )}
        </div>
    );
}
