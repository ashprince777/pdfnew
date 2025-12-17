"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { Presentation, ArrowRight } from 'lucide-react';
import styles from './page.module.css';

export default function PdfToPowerpointPage() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [filename, setFilename] = useState('');

    const handleFilesSelected = (files: File[]) => {
        if (files.length > 0) setFile(files[0]);
    };

    const convertToPpt = async () => {
        if (!file) return;
        setStatus('PROCESSING');

        try {
            // Dynamic import to avoid SSR issues
            const pdfjsLib = await import('pdfjs-dist');
            // @ts-ignore
            const PptxGenJS = (await import('pptxgenjs')).default;
            const pptx = new PptxGenJS();

            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdfDoc = await loadingTask.promise;
            const totalPages = pdfDoc.numPages;

            // pptx already initialized above
            // Set layout to A4 or allow it to be dynamic based on first page?
            // PptxGenJS defaults to 16:9 usually.

            for (let i = 1; i <= totalPages; i++) {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 }); // Good enough quality for screen

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (context) {
                    await page.render({ canvasContext: context, viewport } as any).promise;

                    const imgData = canvas.toDataURL('image/jpeg', 0.8);

                    const slide = pptx.addSlide();
                    // Add image covering the whole slide
                    slide.addImage({
                        data: imgData,
                        x: 0,
                        y: 0,
                        w: '100%',
                        h: '100%'
                    });
                }
            }

            const blob = await pptx.write({ outputType: 'blob' }) as Blob;
            const url = URL.createObjectURL(blob);

            setDownloadUrl(url);
            setFilename(`${file.name.replace('.pdf', '')}.pptx`);
            setStatus('DONE');

        } catch (error) {
            console.error('Error converting PDF to PPT:', error);
            alert('An error occurred during conversion.');
            setStatus('IDLE');
        }
    };

    const reset = () => {
        setFile(null);
        setStatus('IDLE');
        setDownloadUrl(null);
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1>PDF to PowerPoint</h1>
                <p className="text-muted">Convert your PDF files to PPTX presentation slides.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} />
            )}

            {status === 'IDLE' && file && (
                <div className={styles.workspace}>
                    <div className={styles.fileItem}>
                        <span className={styles.fileName}>{file.name}</span>
                        <button onClick={reset} className={styles.removeBtn}>Change</button>
                    </div>

                    <div className="alert alert-info text-center mb-4" style={{ marginTop: '20px' }}>
                        Note: This tool converts PDF pages into slide images. Text will not be editable.
                    </div>

                    <button onClick={convertToPpt} className="btn btn-primary btn-lg mt-4">
                        Convert to PowerPoint <ArrowRight size={20} style={{ marginLeft: '10px' }} />
                    </button>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Converting to PowerPoint..." />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={filename}
                    onReset={reset}
                />
            )}
        </div>
    );
}
