"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { FileImage, ArrowRight, Trash2 } from 'lucide-react';
import JSZip from 'jszip';

export default function PdfToJpgClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [progress, setProgress] = useState('');

    const handleFilesSelected = (newFiles: File[]) => {
        if (newFiles.length > 0) {
            setFile(newFiles[0]);
        }
    };

    const removeFile = () => {
        setFile(null);
    };

    const convertToJpg = async () => {
        if (!file) return;

        setStatus('PROCESSING');

        try {
            // Dynamic import to avoid SSR issues
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdfDoc = await loadingTask.promise;
            const totalPages = pdfDoc.numPages;

            const zip = new JSZip();

            for (let i = 1; i <= totalPages; i++) {
                setProgress(`Converting page ${i} of ${totalPages}...`);
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 }); // High quality

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (context) {
                    await (page.render({ canvasContext: context, viewport } as any).promise);

                    // Convert canvas to JPG blob
                    const blob: Blob = await new Promise((resolve) => {
                        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.92);
                    });

                    const arrBuf = await blob.arrayBuffer();
                    zip.file(`${file.name.replace(/\.[^/.]+$/, '')}_page_${i}.jpg`, arrBuf);
                }
            }

            setProgress('Creating ZIP file...');
            const zipBlob = await zip.generateAsync({ type: 'blob' });

            // Revoke any previous URL
            if (downloadUrl) URL.revokeObjectURL(downloadUrl);

            const url = URL.createObjectURL(zipBlob);
            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error) {
            console.error("Error converting PDF to JPG:", error);
            alert("Error converting file. Please try again.");
            setStatus('IDLE');
        }
    };

    const reset = () => {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setFile(null);
        setStatus('IDLE');
        setDownloadUrl(null);
        setProgress('');
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1 className="text-4xl font-bold mb-4">PDF to JPG</h1>
                <p className="text-muted mb-8 text-lg">Convert each PDF page into a high-quality JPG image.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} multiple={false} accept=".pdf" />
            )}

            {status === 'IDLE' && file && (
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-orange-100 p-3 rounded-lg">
                                <FileImage className="text-orange-600 w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="font-medium text-lg">{file.name}</h3>
                                <p className="text-gray-500 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        </div>
                        <button
                            onClick={removeFile}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-red-500"
                            title="Remove file"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>

                    <div className="flex justify-center">
                        <button
                            onClick={convertToJpg}
                            className="btn btn-primary btn-lg flex items-center gap-2 px-8 py-4 text-xl"
                        >
                            Convert to JPG <ArrowRight size={24} />
                        </button>
                    </div>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status={progress || "Converting PDF to JPG..."} />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={`${file?.name ? file.name.replace(/\.[^/.]+$/, '') : 'images'}_images.zip`}
                    onReset={reset}
                    message="Your JPG images are ready in a ZIP archive!"
                />
            )}
        </div>
    );
}
