"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { Trash2, ArrowRight, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

interface PageInfo {
    pageNum: number; // 1-indexed
    thumbnailUrl?: string;
    isRemoved: boolean;
}

export default function RemovePagesClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [progress, setProgress] = useState('');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [pages, setPages] = useState<PageInfo[]>([]);
    const [rangeInput, setRangeInput] = useState('');

    const handleFilesSelected = async (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        const selectedFile = newFiles[0];
        setFile(selectedFile);
        setProgress('Loading PDF pages...');
        setStatus('PROCESSING');

        try {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const totalPages = pdfDoc.getPageCount();

            const initialPages: PageInfo[] = Array.from({ length: totalPages }, (_, i) => ({
                pageNum: i + 1,
                isRemoved: false,
            }));
            setPages(initialPages);
            setStatus('IDLE');

            // Render thumbnails asynchronously
            try {
                const pdfjsLib = await import('pdfjs-dist');
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
                const pdfjsDoc = await loadingTask.promise;

                for (let i = 1; i <= Math.min(totalPages, 50); i++) {
                    const page = await pdfjsDoc.getPage(i);
                    const viewport = page.getViewport({ scale: 0.35 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    if (context) {
                        await page.render({ canvasContext: context, viewport } as any).promise;
                        const thumb = canvas.toDataURL('image/jpeg', 0.8);
                        setPages((prev) =>
                            prev.map((p) => (p.pageNum === i ? { ...p, thumbnailUrl: thumb } : p))
                        );
                    }
                }
            } catch (thumbErr) {
                console.warn('Thumbnails generation skipped:', thumbErr);
            }
        } catch (error) {
            console.error('Error loading PDF:', error);
            alert('Could not open PDF file.');
            reset();
        }
    };

    const toggleRemove = (pageNum: number) => {
        setPages((prev) =>
            prev.map((p) => (p.pageNum === pageNum ? { ...p, isRemoved: !p.isRemoved } : p))
        );
    };

    const applyRangeInput = () => {
        if (!rangeInput.trim()) return;
        const toRemove = new Set<number>();
        const parts = rangeInput.split(',');

        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map((n) => parseInt(n.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                        toRemove.add(i);
                    }
                }
            } else {
                const num = parseInt(part.trim());
                if (!isNaN(num)) toRemove.add(num);
            }
        }

        setPages((prev) =>
            prev.map((p) => ({
                ...p,
                isRemoved: toRemove.has(p.pageNum) ? true : p.isRemoved,
            }))
        );
    };

    const removePages = async () => {
        const pagesToKeep = pages.filter((p) => !p.isRemoved);

        if (pagesToKeep.length === 0) {
            alert('You cannot remove all pages. At least 1 page must remain.');
            return;
        }

        const removedCount = pages.filter((p) => p.isRemoved).length;
        if (removedCount === 0) {
            alert('Please select at least one page to remove.');
            return;
        }

        if (!file) return;

        setStatus('PROCESSING');
        setProgress('Removing selected pages...');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const originalDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const newDoc = await PDFDocument.create();

            const keepIndices = pagesToKeep.map((p) => p.pageNum - 1);
            const copiedPages = await newDoc.copyPages(originalDoc, keepIndices);
            copiedPages.forEach((page) => newDoc.addPage(page));

            const pdfBytes = await newDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

            if (downloadUrl) URL.revokeObjectURL(downloadUrl);

            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error) {
            console.error('Error removing pages:', error);
            alert('Failed to remove pages. Please try again.');
            setStatus('IDLE');
        }
    };

    const reset = () => {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setFile(null);
        setStatus('IDLE');
        setDownloadUrl(null);
        setProgress('');
        setPages([]);
        setRangeInput('');
    };

    const removedCount = pages.filter((p) => p.isRemoved).length;
    const remainingCount = pages.length - removedCount;

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1 className="text-4xl font-bold mb-4">Remove Pages from PDF</h1>
                <p className="text-muted mb-8 text-lg">Delete unwanted pages from your PDF file. Fast, free, and private.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} multiple={false} accept=".pdf" />
            )}

            {status === 'IDLE' && file && (
                <div className="max-w-5xl mx-auto">
                    {/* Header bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 p-4 bg-white rounded-lg border shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded text-red-600">
                                <FileText size={20} />
                            </div>
                            <div>
                                <span className="font-semibold block">{file.name}</span>
                                <span className="text-sm text-gray-500">
                                    {pages.length} Pages | <span className="text-red-600 font-medium">{removedCount} marked for removal</span> ({remainingCount} will remain)
                                </span>
                            </div>
                        </div>

                        {/* Range input */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <input
                                type="text"
                                value={rangeInput}
                                onChange={(e) => setRangeInput(e.target.value)}
                                placeholder="e.g. 1, 3, 5-8"
                                className="px-3 py-1.5 border rounded text-sm w-full sm:w-36 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <button
                                onClick={applyRangeInput}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium whitespace-nowrap"
                            >
                                Mark
                            </button>
                            <button onClick={reset} className="text-sm text-red-500 hover:text-red-700 ml-2 whitespace-nowrap">
                                Change File
                            </button>
                        </div>
                    </div>

                    <p className="text-sm text-gray-500 mb-4 text-center">
                        Click on any page thumbnail to mark or unmark it for deletion:
                    </p>

                    {/* Page Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
                        {pages.map((item) => (
                            <div
                                key={item.pageNum}
                                onClick={() => toggleRemove(item.pageNum)}
                                className={`cursor-pointer p-3 rounded-lg border-2 transition-all relative select-none flex flex-col justify-between ${
                                    item.isRemoved
                                        ? 'bg-red-50 border-red-500 opacity-70'
                                        : 'bg-white border-gray-200 hover:border-gray-400 shadow-sm'
                                }`}
                            >
                                <div className="aspect-[3/4] bg-gray-100 rounded overflow-hidden flex items-center justify-center mb-2 border relative">
                                    {item.thumbnailUrl ? (
                                        <img
                                            src={item.thumbnailUrl}
                                            alt={`Page ${item.pageNum}`}
                                            className={`w-full h-full object-contain ${item.isRemoved ? 'grayscale' : ''}`}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <FileText size={32} />
                                            <span className="text-sm font-semibold mt-1">Page {item.pageNum}</span>
                                        </div>
                                    )}

                                    {item.isRemoved && (
                                        <div className="absolute inset-0 bg-red-600/30 flex items-center justify-center">
                                            <XCircle size={40} className="text-red-600 drop-shadow-md" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between text-xs pt-1">
                                    <span className="font-semibold text-gray-700">Page {item.pageNum}</span>
                                    {item.isRemoved ? (
                                        <span className="text-red-600 font-medium">Remove</span>
                                    ) : (
                                        <span className="text-green-600 font-medium">Keep</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center">
                        <button
                            onClick={removePages}
                            disabled={removedCount === 0 || remainingCount === 0}
                            className="btn btn-primary btn-lg flex items-center gap-2 px-8 py-3 text-lg disabled:opacity-40"
                        >
                            <Trash2 size={20} /> Remove {removedCount} {removedCount === 1 ? 'Page' : 'Pages'}
                        </button>
                    </div>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status={progress || "Processing PDF..."} />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={`${file?.name ? file.name.replace(/\.[^/.]+$/, '') : 'document'}_cleaned.pdf`}
                    onReset={reset}
                    message={`Successfully removed ${removedCount} page(s)!`}
                />
            )}
        </div>
    );
}
