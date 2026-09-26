"use client";
import React, { useState, useRef, useEffect } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { Type, Highlighter, ArrowRight, Trash2, Plus, FileText } from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface Annotation {
    id: string;
    type: 'text' | 'highlight';
    text?: string;
    pageNum: number;
    x: number; // percentage (0 to 100)
    y: number; // percentage (0 to 100)
    fontSize?: number;
    color?: string;
}

export default function EditPdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);

    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [currentTool, setCurrentTool] = useState<'text' | 'highlight'>('text');
    const [newText, setNewText] = useState('Sample Text');
    const [fontSize, setFontSize] = useState<number>(16);
    const [textColor, setTextColor] = useState<string>('#e33636');

    const previewContainerRef = useRef<HTMLDivElement | null>(null);

    const handleFilesSelected = async (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        const selectedFile = newFiles[0];
        setFile(selectedFile);
        setStatus('PROCESSING');

        try {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const count = pdfDoc.getPageCount();
            setTotalPages(count);
            setCurrentPage(1);

            await renderPagePreview(arrayBuffer, 1);
            setStatus('IDLE');
        } catch (e) {
            console.error('Error loading PDF:', e);
            alert('Failed to load PDF.');
            reset();
        }
    };

    const renderPagePreview = async (arrayBuffer: ArrayBuffer, pageNum: number) => {
        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
            const doc = await loadingTask.promise;
            const page = await doc.getPage(pageNum);

            const viewport = page.getViewport({ scale: 1.2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                await page.render({ canvasContext: context, viewport } as any).promise;
                setPageImageUrl(canvas.toDataURL('image/jpeg', 0.9));
            }
        } catch (err) {
            console.warn('Preview render error', err);
        }
    };

    const handlePageChange = async (newPage: number) => {
        if (!file || newPage < 1 || newPage > totalPages) return;
        setCurrentPage(newPage);
        const arrayBuffer = await file.arrayBuffer();
        await renderPagePreview(arrayBuffer, newPage);
    };

    const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!previewContainerRef.current) return;
        const rect = previewContainerRef.current.getBoundingClientRect();
        const clickX = ((e.clientX - rect.left) / rect.width) * 100;
        const clickY = ((e.clientY - rect.top) / rect.height) * 100;

        const newAnnotation: Annotation = {
            id: `ann-${Date.now()}`,
            type: currentTool,
            pageNum: currentPage,
            x: Math.round(clickX),
            y: Math.round(clickY),
            text: currentTool === 'text' ? newText : undefined,
            fontSize: currentTool === 'text' ? fontSize : undefined,
            color: currentTool === 'text' ? textColor : undefined,
        };

        setAnnotations((prev) => [...prev, newAnnotation]);
    };

    const deleteAnnotation = (id: string) => {
        setAnnotations((prev) => prev.filter((a) => a.id !== id));
    };

    const hexToRgb = (hex: string) => {
        const clean = hex.replace('#', '');
        const r = parseInt(clean.substring(0, 2), 16) / 255 || 0;
        const g = parseInt(clean.substring(2, 4), 16) / 255 || 0;
        const b = parseInt(clean.substring(4, 6), 16) / 255 || 0;
        return rgb(r, g, b);
    };

    const saveEditedPdf = async () => {
        if (!file) return;

        setStatus('PROCESSING');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            for (const ann of annotations) {
                if (ann.pageNum > pdfDoc.getPageCount()) continue;
                const page = pdfDoc.getPage(ann.pageNum - 1);
                const { width, height } = page.getSize();

                // Coordinates in PDF (origin at bottom-left)
                const pdfX = (ann.x / 100) * width;
                const pdfY = height - (ann.y / 100) * height;

                if (ann.type === 'text' && ann.text) {
                    const color = ann.color ? hexToRgb(ann.color) : rgb(0.9, 0.1, 0.1);
                    page.drawText(ann.text, {
                        x: pdfX,
                        y: pdfY,
                        size: ann.fontSize || 16,
                        font,
                        color,
                    });
                } else if (ann.type === 'highlight') {
                    page.drawRectangle({
                        x: pdfX,
                        y: pdfY - 14,
                        width: 120,
                        height: 20,
                        color: rgb(1, 0.9, 0),
                        opacity: 0.45,
                    });
                }
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

            if (downloadUrl) URL.revokeObjectURL(downloadUrl);

            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error) {
            console.error('Error saving edited PDF:', error);
            alert('Failed to save edited PDF.');
            setStatus('IDLE');
        }
    };

    const reset = () => {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setFile(null);
        setStatus('IDLE');
        setDownloadUrl(null);
        setAnnotations([]);
        setPageImageUrl(null);
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1 className="text-4xl font-bold mb-4">Edit PDF Document</h1>
                <p className="text-muted mb-8 text-lg">Add text, annotations, and highlights directly onto your PDF pages.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} multiple={false} accept=".pdf" />
            )}

            {status === 'IDLE' && file && (
                <div className="max-w-5xl mx-auto space-y-6">
                    {/* Header Controls */}
                    <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800">{file.name}</span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                Page {currentPage} of {totalPages}
                            </span>
                        </div>

                        {/* Page Selector */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage <= 1}
                                className="px-3 py-1 bg-gray-100 rounded text-sm disabled:opacity-30"
                            >
                                Prev
                            </button>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage >= totalPages}
                                className="px-3 py-1 bg-gray-100 rounded text-sm disabled:opacity-30"
                            >
                                Next
                            </button>
                            <button onClick={reset} className="text-sm text-red-500 hover:text-red-700 ml-2">
                                Change File
                            </button>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setCurrentTool('text')}
                                className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 ${
                                    currentTool === 'text' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
                                }`}
                            >
                                <Type size={16} /> Add Text
                            </button>
                            <button
                                onClick={() => setCurrentTool('highlight')}
                                className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 ${
                                    currentTool === 'highlight' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700'
                                }`}
                            >
                                <Highlighter size={16} /> Add Highlight
                            </button>
                        </div>

                        {currentTool === 'text' && (
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={newText}
                                    onChange={(e) => setNewText(e.target.value)}
                                    placeholder="Enter text..."
                                    className="p-1.5 border rounded text-sm w-44"
                                />
                                <select
                                    value={fontSize}
                                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                                    className="p-1.5 border rounded text-sm bg-white"
                                >
                                    <option value={12}>12pt</option>
                                    <option value={16}>16pt</option>
                                    <option value={20}>20pt</option>
                                    <option value={24}>24pt</option>
                                    <option value={32}>32pt</option>
                                </select>
                                <input
                                    type="color"
                                    value={textColor}
                                    onChange={(e) => setTextColor(e.target.value)}
                                    className="w-8 h-8 rounded border cursor-pointer"
                                />
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                        👉 Click anywhere on the document preview below to place your {currentTool}:
                    </p>

                    {/* Document Preview Canvas */}
                    <div className="flex justify-center">
                        <div
                            ref={previewContainerRef}
                            onClick={handlePreviewClick}
                            className="relative border shadow-lg rounded-lg overflow-hidden cursor-crosshair bg-white select-none max-w-full"
                            style={{ minHeight: '400px' }}
                        >
                            {pageImageUrl ? (
                                <img src={pageImageUrl} alt={`Page ${currentPage}`} className="block max-w-full h-auto" />
                            ) : (
                                <div className="p-16 text-center text-gray-400">Loading page preview...</div>
                            )}

                            {/* Render Annotations on Current Page */}
                            {annotations
                                .filter((a) => a.pageNum === currentPage)
                                .map((ann) => (
                                    <div
                                        key={ann.id}
                                        style={{
                                            position: 'absolute',
                                            left: `${ann.x}%`,
                                            top: `${ann.y}%`,
                                            transform: 'translate(-10%, -50%)',
                                        }}
                                        className="group"
                                    >
                                        {ann.type === 'text' && (
                                            <div
                                                style={{
                                                    color: ann.color || '#e33636',
                                                    fontSize: `${ann.fontSize || 16}px`,
                                                    fontWeight: 'bold',
                                                }}
                                                className="bg-white/80 px-1 rounded shadow-sm border border-dashed border-gray-400 flex items-center gap-1"
                                            >
                                                <span>{ann.text}</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteAnnotation(ann.id);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        )}

                                        {ann.type === 'highlight' && (
                                            <div
                                                style={{
                                                    backgroundColor: 'rgba(255, 230, 0, 0.45)',
                                                    width: '120px',
                                                    height: '22px',
                                                }}
                                                className="border border-yellow-500 rounded flex items-center justify-end pr-1"
                                            >
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteAnnotation(ann.id);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>

                    <div className="flex justify-center pt-4">
                        <button
                            onClick={saveEditedPdf}
                            className="btn btn-primary btn-lg flex items-center gap-2 px-8 py-3 text-lg"
                        >
                            Save & Download PDF <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Rendering and saving changes..." />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={`edited_${file?.name}`}
                    onReset={reset}
                    message="Your edited PDF is ready!"
                />
            )}
        </div>
    );
}
