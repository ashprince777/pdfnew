"use client";
import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { Trash2, FileText, ArrowRight } from 'lucide-react';
import styles from './page.module.css';

export default function MergeClient() {
    const [files, setFiles] = useState<File[]>([]);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

    const handleFilesSelected = (newFiles: File[]) => {
        setFiles((prev) => [...prev, ...newFiles]);
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const mergePdfs = async () => {
        if (files.length < 2) {
            alert('Please select at least 2 PDF files to merge.');
            return;
        }

        setStatus('PROCESSING');

        try {
            const mergedPdf = await PDFDocument.create();

            for (const file of files) {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            const pdfBytes = await mergedPdf.save();
            const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error) {
            console.error('Error merging PDFs:', error);
            alert('An error occurred while merging PDFs. Please try again.');
            setStatus('IDLE');
        }
    };

    const reset = () => {
        setFiles([]);
        setStatus('IDLE');
        setDownloadUrl(null);
    };

    return (
        <div className="container">
            {/* Title Section */}
            <div className="text-center mt-4 mb-4">
                <h1>Merge PDF Files</h1>
                <p className="text-muted">Combine PDFs in the order you want with the easiest PDF merger available.</p>
            </div>

            {status === 'IDLE' && files.length === 0 && (
                <FileUploader onFilesSelected={handleFilesSelected} multiple={true} />
            )}

            {status === 'IDLE' && files.length > 0 && (
                <div className={styles.workspace}>
                    <div className={styles.fileList}>
                        {files.map((file, index) => (
                            <div key={`${file.name}-${index}`} className={styles.fileItem}>
                                <div className={styles.fileInfo}>
                                    <FileText className={styles.fileIcon} />
                                    <span className={styles.fileName}>{file.name}</span>
                                    <span className={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                                <button onClick={() => removeFile(index)} className={styles.removeBtn}>
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className={styles.actions}>
                        <FileUploader onFilesSelected={handleFilesSelected} multiple={true} />
                    </div>

                    <div className={styles.bottomBar}>
                        <button onClick={mergePdfs} className="btn btn-primary btn-lg">
                            Merge PDF <ArrowRight size={20} style={{ marginLeft: '10px' }} />
                        </button>
                    </div>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Merging PDFs..." />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename="merged.pdf"
                    onReset={reset}
                />
            )}
        </div>
    );
}
