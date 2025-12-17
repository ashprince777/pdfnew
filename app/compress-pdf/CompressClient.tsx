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

    const handleFilesSelected = (files: File[]) => {
        if (files.length > 0) setFile(files[0]);
    };

    const compressPdf = async () => {
        if (!file) return;
        setStatus('PROCESSING');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
            const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            setFileSizeInfo({
                original: file.size,
                new: blob.size
            });
            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error) {
            console.error('Error compressing PDF:', error);
            alert('An error occurred.');
            setStatus('IDLE');
        }
    };

    const reset = () => {
        setFile(null);
        setStatus('IDLE');
        setDownloadUrl(null);
        setFileSizeInfo(null);
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1>Compress PDF File</h1>
                <p className="text-muted">Reduce the file size of your PDF while maintaining the best possible quality.</p>
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
                            <span className={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                        <button onClick={reset} className={styles.removeBtn}>Change</button>
                    </div>

                    <div className={styles.bottomBar}>
                        <button onClick={compressPdf} className="btn btn-primary btn-lg">
                            Compress PDF <ArrowRight size={20} style={{ marginLeft: '10px' }} />
                        </button>
                    </div>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Compressing PDF..." />}

            {status === 'DONE' && downloadUrl && fileSizeInfo && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={`compressed_${file?.name}`}
                    onReset={reset}
                    message={`Your PDF is now ${(fileSizeInfo.new < fileSizeInfo.original ? (100 - (fileSizeInfo.new / fileSizeInfo.original * 100)).toFixed(0) : 0)}% smaller!`}
                />
            )}
        </div>
    );
}
