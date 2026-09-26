"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { Lock, Unlock, Trash2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

export default function UnlockPdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [resultMessage, setResultMessage] = useState('');

    const handleFilesSelected = (newFiles: File[]) => {
        if (newFiles.length > 0) setFile(newFiles[0]);
    };

    const removeFile = () => {
        setFile(null);
        setPassword('');
    };

    const unlockPdf = async () => {
        if (!file) return;

        setStatus('PROCESSING');

        try {
            const arrayBuffer = await file.arrayBuffer();

            // Dynamic import to avoid SSR issues
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            let decryptedDoc;
            try {
                const loadingTask = pdfjsLib.getDocument({
                    data: arrayBuffer,
                    password: password || undefined,
                });
                decryptedDoc = await loadingTask.promise;
            } catch (err: any) {
                if (err?.name === 'PasswordException') {
                    if (!password) {
                        throw new Error('This PDF is password-protected. Please enter the password to unlock it.');
                    } else {
                        throw new Error('Incorrect password. Please verify the password and try again.');
                    }
                }
                throw err;
            }

            // Reconstruct the clean, unlocked PDF
            const newDoc = await PDFDocument.create();
            const totalPages = decryptedDoc.numPages;

            for (let i = 1; i <= totalPages; i++) {
                const page = await decryptedDoc.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    await (page as any).render({ canvasContext: ctx, canvas, viewport }).promise;
                    const imgData = canvas.toDataURL('image/jpeg', 0.95);
                    const img = await newDoc.embedJpg(imgData);

                    const origViewport = page.getViewport({ scale: 1.0 });
                    const newPage = newDoc.addPage([origViewport.width, origViewport.height]);
                    newPage.drawImage(img, {
                        x: 0,
                        y: 0,
                        width: origViewport.width,
                        height: origViewport.height,
                    });
                }
            }

            const pdfBytes = await newDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

            if (downloadUrl) URL.revokeObjectURL(downloadUrl);

            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setResultMessage('PDF unlocked successfully! All restrictions and passwords have been removed.');
            setStatus('DONE');
        } catch (error) {
            console.error('Error unlocking PDF:', error);
            alert(error instanceof Error ? error.message : 'Could not unlock this file.');
            setStatus('IDLE');
        }
    };

    const reset = () => {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setFile(null);
        setPassword('');
        setStatus('IDLE');
        setDownloadUrl(null);
        setResultMessage('');
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1 className="text-4xl font-bold mb-4">Unlock PDF</h1>
                <p className="text-muted mb-8 text-lg">Remove password protection and restrictions from your PDF.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} multiple={false} accept=".pdf" />
            )}

            {status === 'IDLE' && file && (
                <div className="max-w-xl mx-auto">
                    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-red-100 p-3 rounded-lg">
                                    <Lock className="text-red-600 w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-lg">{file.name}</h3>
                                    <p className="text-gray-500 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            </div>
                            <button onClick={removeFile} className="text-gray-400 hover:text-red-500">
                                <Trash2 />
                            </button>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password (if required)
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                placeholder="Enter PDF password"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Enter the password used to protect this PDF to remove it permanently.
                            </p>
                        </div>

                        <button
                            onClick={unlockPdf}
                            className="w-full btn btn-primary btn-lg flex items-center justify-center gap-2"
                        >
                            <Unlock size={20} /> Unlock PDF
                        </button>
                    </div>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Removing security restrictions..." />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={`unlocked_${file?.name}`}
                    onReset={reset}
                    message={resultMessage}
                />
            )}
        </div>
    );
}
