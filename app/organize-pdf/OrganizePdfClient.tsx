"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { Trash2, ArrowRight, ArrowUp, ArrowDown, FileText } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

interface PageItem {
    id: string;
    originalPageNum: number; // 1-indexed
    thumbnailUrl?: string;
}

export default function OrganizePdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [progress, setProgress] = useState('');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [pages, setPages] = useState<PageItem[]>([]);

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

            const initialPages: PageItem[] = Array.from({ length: totalPages }, (_, i) => ({
                id: `page-${i + 1}-${Date.now()}`,
                originalPageNum: i + 1,
            }));
            setPages(initialPages);
            setStatus('IDLE');

            // Render thumbnails asynchronously in background
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
                            prev.map((p) =>
                                p.originalPageNum === i ? { ...p, thumbnailUrl: thumb } : p
                            )
                        );
                    }
                }
            } catch (thumbErr) {
                console.warn('Could not generate all thumbnails:', thumbErr);
            }
        } catch (error) {
            console.error('Error loading PDF:', error);
            alert('Failed to load PDF. Please ensure the file is valid.');
            reset();
        }
    };

    const removeFile = () => {
        reset();
    };

    const movePage = (index: number, direction: 'up' | 'down') => {
        const newPages = [...pages];
        if (direction === 'up' && index > 0) {
            [newPages[index], newPages[index - 1]] = [newPages[index - 1], newPages[index]];
        } else if (direction === 'down' && index < newPages.length - 1) {
            [newPages[index], newPages[index + 1]] = [newPages[index + 1], newPages[index]];
        }
        setPages(newPages);
    };

    const deletePage = (index: number) => {
        if (pages.length <= 1) {
            alert('PDF must contain at least 1 page.');
            return;
        }
        const newPages = pages.filter((_, i) => i !== index);
        setPages(newPages);
    };

    const saveChanges = async () => {
        if (!file || pages.length === 0) return;
        setStatus('PROCESSING');
        setProgress('Reorganizing and saving PDF...');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const originalDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const newDoc = await PDFDocument.create();

            const targetIndices = pages.map((p) => p.originalPageNum - 1);
            const copiedPages = await newDoc.copyPages(originalDoc, targetIndices);
            copiedPages.forEach((page) => newDoc.addPage(page));

            const pdfBytes = await newDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

            if (downloadUrl) URL.revokeObjectURL(downloadUrl);

            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error) {
            console.error('Error saving organized PDF:', error);
            alert('Failed to save organized PDF. Please try again.');
            setStatus('IDLE');
        }
    };

    const reset = () => {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setFile(null);
        setStatus('IDLE');
        setProgress('');
        setDownloadUrl(null);
        setPages([]);
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1 className="text-4xl font-bold mb-4">Organize PDF</h1>
                <p className="text-muted mb-8 text-lg">Sort, reorder, and delete pages from your PDF.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} multiple={false} accept=".pdf" />
            )}

            {status === 'IDLE' && file && (
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-6 p-4 bg-white rounded-lg border shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded text-red-600">
                                <FileText size={20} />
                            </div>
                            <div>
                                <span className="font-semibold block">{file.name}</span>
                                <span className="text-sm text-gray-500">{pages.length} Pages remaining</span>
                            </div>
                        </div>
                        <button onClick={removeFile} className="text-red-500 hover:text-red-700 font-medium text-sm">
                            Change File
                        </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
                        {pages.map((item, index) => (
                            <div key={item.id} className="bg-white p-3 rounded-lg shadow-sm border relative group hover:border-red-400 transition-all flex flex-col justify-between">
                                <div className="aspect-[3/4] bg-gray-100 rounded overflow-hidden flex items-center justify-center mb-2 border">
                                    {item.thumbnailUrl ? (
                                        <img
                                            src={item.thumbnailUrl}
                                            alt={`Page ${item.originalPageNum}`}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <FileText size={32} />
                                            <span className="text-sm font-semibold mt-1">Page {item.originalPageNum}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between mt-1 pt-2 border-t text-xs text-gray-500">
                                    <span className="font-medium text-gray-700">Pos: {index + 1} (Pg {item.originalPageNum})</span>
                                    <button
                                        onClick={() => deletePage(index)}
                                        className="text-gray-400 hover:text-red-600 p-1 rounded"
                                        title="Delete page"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>

                                <div className="flex justify-center gap-2 mt-2">
                                    <button
                                        onClick={() => movePage(index, 'up')}
                                        disabled={index === 0}
                                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-20 border text-gray-700"
                                        title="Move left"
                                    >
                                        <ArrowUp size={14} className="-rotate-90" />
                                    </button>
                                    <button
                                        onClick={() => movePage(index, 'down')}
                                        disabled={index === pages.length - 1}
                                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-20 border text-gray-700"
                                        title="Move right"
                                    >
                                        <ArrowDown size={14} className="-rotate-90" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center">
                        <button onClick={saveChanges} className="btn btn-primary btn-lg flex items-center gap-2 px-8 py-3 text-lg">
                            Save Organized PDF <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status={progress || "Organizing PDF..."} />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={`${file?.name ? file.name.replace(/\.[^/.]+$/, '') : 'document'}_organized.pdf`}
                    onReset={reset}
                    message="Your organized PDF is ready!"
                />
            )}
        </div>
    );
}
