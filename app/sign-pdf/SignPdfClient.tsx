"use client";
import React, { useState, useRef, useEffect } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { PenTool, ArrowRight, Trash2, RotateCcw, FileText, Check } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

export default function SignPdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [targetPageMode, setTargetPageMode] = useState<'last' | 'first' | 'all' | 'custom'>('last');
    const [customPage, setCustomPage] = useState<number>(1);
    const [position, setPosition] = useState<'bottom_right' | 'bottom_center' | 'bottom_left'>('bottom_right');
    const [signMode, setSignMode] = useState<'draw' | 'type'>('draw');
    const [typedName, setTypedName] = useState('');
    const [penColor, setPenColor] = useState<'black' | 'blue'>('blue');

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    const handleFilesSelected = async (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        const selectedFile = newFiles[0];
        setFile(selectedFile);

        try {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const count = pdfDoc.getPageCount();
            setTotalPages(count);
            setCustomPage(count);
        } catch (e) {
            console.warn('Could not read page count upfront', e);
        }
    };

    // Canvas drawing handlers
    useEffect(() => {
        if (signMode === 'draw' && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineWidth = 2.5;
                ctx.strokeStyle = penColor === 'blue' ? '#0033cc' : '#111111';
            }
        }
    }, [signMode, penColor]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
        setIsDrawing(true);
        setHasDrawn(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setHasDrawn(false);
    };

    const getSignatureImageBuffer = async (): Promise<ArrayBuffer | null> => {
        if (signMode === 'draw') {
            const canvas = canvasRef.current;
            if (!canvas || !hasDrawn) return null;
            const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'));
            return await blob.arrayBuffer();
        } else {
            // Type mode: render text into a canvas
            if (!typedName.trim()) return null;
            const offscreenCanvas = document.createElement('canvas');
            offscreenCanvas.width = 400;
            offscreenCanvas.height = 150;
            const ctx = offscreenCanvas.getContext('2d');
            if (!ctx) return null;

            ctx.font = 'italic 48px "Brush Script MT", cursive, sans-serif';
            ctx.fillStyle = penColor === 'blue' ? '#0033cc' : '#111111';
            ctx.textBaseline = 'middle';
            ctx.fillText(typedName, 20, 75);

            const blob: Blob = await new Promise((res) => offscreenCanvas.toBlob((b) => res(b!), 'image/png'));
            return await blob.arrayBuffer();
        }
    };

    const signPdf = async () => {
        if (!file) return;

        const sigBuffer = await getSignatureImageBuffer();
        if (!sigBuffer) {
            alert(signMode === 'draw' ? 'Please draw your signature first.' : 'Please enter your name to sign.');
            return;
        }

        setStatus('PROCESSING');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const sigImage = await pdfDoc.embedPng(sigBuffer);

            const numPages = pdfDoc.getPageCount();
            const pagesToSign: number[] = [];

            if (targetPageMode === 'first') pagesToSign.push(0);
            else if (targetPageMode === 'last') pagesToSign.push(numPages - 1);
            else if (targetPageMode === 'all') {
                for (let i = 0; i < numPages; i++) pagesToSign.push(i);
            } else if (targetPageMode === 'custom') {
                const targetIdx = Math.max(0, Math.min(customPage - 1, numPages - 1));
                pagesToSign.push(targetIdx);
            }

            const sigWidth = 140;
            const sigHeight = (sigImage.height / sigImage.width) * sigWidth;
            const margin = 45;

            for (const idx of pagesToSign) {
                const page = pdfDoc.getPage(idx);
                const { width } = page.getSize();

                let x = width - sigWidth - margin;
                const y = margin;

                if (position === 'bottom_left') x = margin;
                if (position === 'bottom_center') x = (width - sigWidth) / 2;
                if (position === 'bottom_right') x = width - sigWidth - margin;

                page.drawImage(sigImage, {
                    x,
                    y,
                    width: sigWidth,
                    height: sigHeight,
                });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

            if (downloadUrl) URL.revokeObjectURL(downloadUrl);

            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error) {
            console.error('Error signing PDF:', error);
            alert('Failed to sign PDF. Please try again.');
            setStatus('IDLE');
        }
    };

    const reset = () => {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setFile(null);
        setStatus('IDLE');
        setDownloadUrl(null);
        clearCanvas();
        setTypedName('');
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1 className="text-4xl font-bold mb-4">Sign PDF Document</h1>
                <p className="text-muted mb-8 text-lg">Draw, type, or stamp your legally-binding signature onto your PDF file.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} multiple={false} accept=".pdf" />
            )}

            {status === 'IDLE' && file && (
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Document Header */}
                    <div className="bg-white p-5 rounded-lg border shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-100 rounded-lg text-blue-600">
                                <PenTool size={24} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-800">{file.name}</h3>
                                <p className="text-xs text-gray-500">{totalPages} {totalPages === 1 ? 'Page' : 'Pages'}</p>
                            </div>
                        </div>
                        <button onClick={reset} className="text-gray-400 hover:text-red-500 p-2">
                            <Trash2 size={20} />
                        </button>
                    </div>

                    {/* Signature Creation Box */}
                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                        <div className="flex items-center justify-between border-b pb-4 mb-4">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSignMode('draw')}
                                    className={`px-4 py-1.5 rounded-md font-medium text-sm transition-colors ${
                                        signMode === 'draw' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    Draw Signature
                                </button>
                                <button
                                    onClick={() => setSignMode('type')}
                                    className={`px-4 py-1.5 rounded-md font-medium text-sm transition-colors ${
                                        signMode === 'type' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    Type Signature
                                </button>
                            </div>

                            {/* Color Selector */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPenColor('blue')}
                                    className={`w-6 h-6 rounded-full bg-blue-700 flex items-center justify-center text-white ${
                                        penColor === 'blue' ? 'ring-2 ring-offset-2 ring-blue-700' : ''
                                    }`}
                                    title="Blue ink"
                                >
                                    {penColor === 'blue' && <Check size={14} />}
                                </button>
                                <button
                                    onClick={() => setPenColor('black')}
                                    className={`w-6 h-6 rounded-full bg-black flex items-center justify-center text-white ${
                                        penColor === 'black' ? 'ring-2 ring-offset-2 ring-black' : ''
                                    }`}
                                    title="Black ink"
                                >
                                    {penColor === 'black' && <Check size={14} />}
                                </button>
                            </div>
                        </div>

                        {signMode === 'draw' && (
                            <div>
                                <div className="border-2 border-dashed rounded-lg bg-gray-50 relative overflow-hidden">
                                    <canvas
                                        ref={canvasRef}
                                        width={500}
                                        height={160}
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                        className="w-full h-40 cursor-crosshair touch-none"
                                    />
                                    {!hasDrawn && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-sm">
                                            Sign here with your mouse, pen, or finger
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end mt-2">
                                    <button
                                        onClick={clearCanvas}
                                        className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 font-medium"
                                    >
                                        <RotateCcw size={13} /> Clear Canvas
                                    </button>
                                </div>
                            </div>
                        )}

                        {signMode === 'type' && (
                            <div>
                                <input
                                    type="text"
                                    value={typedName}
                                    onChange={(e) => setTypedName(e.target.value)}
                                    placeholder="Type your full name..."
                                    className="w-full p-3 border rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                                />
                                {typedName && (
                                    <div className="p-4 border rounded-lg bg-gray-50 text-center">
                                        <p
                                            className="text-4xl"
                                            style={{
                                                fontFamily: '"Brush Script MT", cursive, sans-serif',
                                                color: penColor === 'blue' ? '#0033cc' : '#111111',
                                            }}
                                        >
                                            {typedName}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Placement Settings */}
                    <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
                        <h4 className="font-semibold text-gray-800 border-b pb-2">Signature Placement</h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Apply on Page</label>
                                <select
                                    value={targetPageMode}
                                    onChange={(e) => setTargetPageMode(e.target.value as any)}
                                    className="w-full p-2.5 border rounded-lg bg-white text-sm"
                                >
                                    <option value="last">Last Page (Recommended)</option>
                                    <option value="first">First Page</option>
                                    <option value="all">All Pages</option>
                                    <option value="custom">Specific Page</option>
                                </select>
                            </div>

                            {targetPageMode === 'custom' && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Page Number</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={totalPages}
                                        value={customPage}
                                        onChange={(e) => setCustomPage(Math.min(totalPages, Math.max(1, parseInt(e.target.value) || 1)))}
                                        className="w-full p-2 border rounded-lg text-sm"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Position on Page</label>
                                <select
                                    value={position}
                                    onChange={(e) => setPosition(e.target.value as any)}
                                    className="w-full p-2.5 border rounded-lg bg-white text-sm"
                                >
                                    <option value="bottom_right">Bottom Right</option>
                                    <option value="bottom_center">Bottom Center</option>
                                    <option value="bottom_left">Bottom Left</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={signPdf}
                        className="w-full btn btn-primary btn-lg flex items-center justify-center gap-2 py-4 text-xl"
                    >
                        Sign & Download PDF <ArrowRight size={22} />
                    </button>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Embedding signature into PDF..." />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={`${file?.name ? file.name.replace(/\.[^/.]+$/, '') : 'document'}_signed.pdf`}
                    onReset={reset}
                    message="Document signed successfully!"
                />
            )}
        </div>
    );
}
