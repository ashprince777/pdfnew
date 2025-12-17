"use client";
import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { FileText, ArrowRight } from 'lucide-react';
import styles from './page.module.css';

export default function SplitClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [zipFilename, setZipFilename] = useState<string>('split_files.zip'); // Or .pdf if single
    const [mode, setMode] = useState<'ALL_PAGES' | 'RANGES'>('ALL_PAGES');
    const [ranges, setRanges] = useState<string>('');

    const handleFilesSelected = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
        }
    };

    const splitPdf = async () => {
        if (!file) return;
        setStatus('PROCESSING');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const totalPages = pdfDoc.getPageCount();

            if (mode === 'ALL_PAGES') {
                const zip = new JSZip();

                for (let i = 0; i < totalPages; i++) {
                    const newPdf = await PDFDocument.create();
                    const [page] = await newPdf.copyPages(pdfDoc, [i]);
                    newPdf.addPage(page);
                    const pdfBytes = await newPdf.save();
                    zip.file(`${file.name.replace('.pdf', '')}_page_${i + 1}.pdf`, pdfBytes);
                }

                const content = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(content);
                setDownloadUrl(url);
                setZipFilename(`${file.name.replace('.pdf', '')}_split.zip`);
            } else {
                // Range extraction logic
                const pageIndices: number[] = [];
                const parts = ranges.split(',');
                for (const part of parts) {
                    if (part.includes('-')) {
                        const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                        if (!isNaN(start) && !isNaN(end)) {
                            for (let i = start; i <= end; i++) {
                                if (i >= 1 && i <= totalPages) pageIndices.push(i - 1);
                            }
                        }
                    } else {
                        const page = parseInt(part.trim());
                        if (!isNaN(page) && page >= 1 && page <= totalPages) {
                            pageIndices.push(page - 1);
                        }
                    }
                }

                const uniqueIndices = Array.from(new Set(pageIndices)).sort((a, b) => a - b);

                if (uniqueIndices.length === 0) {
                    alert('Invalid page range.');
                    setStatus('IDLE');
                    return;
                }

                const newPdf = await PDFDocument.create();
                const copiedPages = await newPdf.copyPages(pdfDoc, uniqueIndices);
                copiedPages.forEach(page => newPdf.addPage(page));

                const pdfBytes = await newPdf.save();
                const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                setDownloadUrl(url);
                setZipFilename(`${file.name.replace('.pdf', '')}_extracted.pdf`);
            }

            setStatus('DONE');
        } catch (error) {
            console.error('Error splitting PDF:', error);
            alert('An error occurred.');
            setStatus('IDLE');
        }
    };

    const reset = () => {
        setFile(null);
        setStatus('IDLE');
        setDownloadUrl(null);
        setRanges('');
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1>Split PDF File</h1>
                <p className="text-muted">Extract pages from your PDF or save each page as a separate PDF file.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} multiple={false} />
            )}

            {status === 'IDLE' && file && (
                <div className={styles.workspace}>
                    <div className={styles.fileItem}>
                        <div className={styles.fileInfo}>
                            <FileText className={styles.fileIcon} />
                            <span className={styles.fileName}>{file.name}</span>
                        </div>
                        <button onClick={reset} className={styles.removeBtn}>Change File</button>
                    </div>

                    <div className={styles.options}>
                        <h3>Split Options</h3>
                        <div className={styles.radioGroup}>
                            <label className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    name="mode"
                                    checked={mode === 'ALL_PAGES'}
                                    onChange={() => setMode('ALL_PAGES')}
                                />
                                <span className={styles.radioText}>Extract every page into separate files</span>
                            </label>
                            <label className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    name="mode"
                                    checked={mode === 'RANGES'}
                                    onChange={() => setMode('RANGES')}
                                />
                                <span className={styles.radioText}>Select pages to extract</span>
                            </label>
                        </div>

                        {mode === 'RANGES' && (
                            <div className={styles.rangeInput}>
                                <label>Pages to extract (e.g. 1, 3-5, 8):</label>
                                <input
                                    type="text"
                                    value={ranges}
                                    onChange={(e) => setRanges(e.target.value)}
                                    placeholder="Example: 1-5, 8, 11-13"
                                    className={styles.input}
                                />
                            </div>
                        )}
                    </div>

                    <div className={styles.bottomBar}>
                        <button onClick={splitPdf} className="btn btn-primary btn-lg">
                            Split PDF <ArrowRight size={20} style={{ marginLeft: '10px' }} />
                        </button>
                    </div>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Splitting PDF..." />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={zipFilename}
                    onReset={reset}
                />
            )}
        </div>
    );
}
