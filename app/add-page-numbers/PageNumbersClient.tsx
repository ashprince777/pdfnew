"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { Hash, ArrowRight, Trash2 } from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export default function PageNumbersClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [position, setPosition] = useState<'bottom_right' | 'bottom_center' | 'bottom_left' | 'top_right' | 'top_center' | 'top_left'>('bottom_right');
    const [format, setFormat] = useState<'number' | 'page_x' | 'page_x_of_y' | 'x_slash_y'>('page_x_of_y');
    const [startNum, setStartNum] = useState<number>(1);
    const [fontSize, setFontSize] = useState<number>(11);

    const handleFilesSelected = (newFiles: File[]) => {
        if (newFiles.length > 0) setFile(newFiles[0]);
    };

    const removeFile = () => {
        setFile(null);
    };

    const addNumbers = async () => {
        if (!file) return;

        setStatus('PROCESSING');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const totalPages = pdfDoc.getPageCount();

            for (let i = 0; i < totalPages; i++) {
                const page = pdfDoc.getPage(i);
                const { width, height } = page.getSize();
                const curNum = startNum + i;
                const totalEnd = startNum + totalPages - 1;

                let text = `${curNum}`;
                if (format === 'page_x') text = `Page ${curNum}`;
                else if (format === 'page_x_of_y') text = `Page ${curNum} of ${totalEnd}`;
                else if (format === 'x_slash_y') text = `${curNum} / ${totalEnd}`;

                const textWidth = font.widthOfTextAtSize(text, fontSize);
                const margin = 36;
                let x = margin;
                let y = margin;

                switch (position) {
                    case 'bottom_left':
                        x = margin;
                        y = margin;
                        break;
                    case 'bottom_center':
                        x = (width - textWidth) / 2;
                        y = margin;
                        break;
                    case 'bottom_right':
                        x = width - textWidth - margin;
                        y = margin;
                        break;
                    case 'top_left':
                        x = margin;
                        y = height - margin - fontSize;
                        break;
                    case 'top_center':
                        x = (width - textWidth) / 2;
                        y = height - margin - fontSize;
                        break;
                    case 'top_right':
                        x = width - textWidth - margin;
                        y = height - margin - fontSize;
                        break;
                }

                page.drawText(text, {
                    x,
                    y,
                    size: fontSize,
                    font,
                    color: rgb(0.2, 0.2, 0.2),
                });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

            if (downloadUrl) URL.revokeObjectURL(downloadUrl);

            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error) {
            console.error('Error adding page numbers:', error);
            alert('Failed to add page numbers. Please try again.');
            setStatus('IDLE');
        }
    };

    const reset = () => {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setFile(null);
        setStatus('IDLE');
        setDownloadUrl(null);
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1 className="text-4xl font-bold mb-4">Add Page Numbers to PDF</h1>
                <p className="text-muted mb-8 text-lg">Insert page numbers into your PDF document with customizable formatting and position.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} multiple={false} accept=".pdf" />
            )}

            {status === 'IDLE' && file && (
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-100 p-3 rounded-lg">
                                <Hash className="text-blue-600 w-8 h-8" />
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

                    {/* Options Panel */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6 space-y-5">
                        <h3 className="font-semibold text-gray-800 text-lg border-b pb-2">Page Number Settings</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Position on Page</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'top_left', label: 'Top Left' },
                                    { id: 'top_center', label: 'Top Center' },
                                    { id: 'top_right', label: 'Top Right' },
                                    { id: 'bottom_left', label: 'Bottom Left' },
                                    { id: 'bottom_center', label: 'Bottom Center' },
                                    { id: 'bottom_right', label: 'Bottom Right' },
                                ].map((pos) => (
                                    <button
                                        key={pos.id}
                                        type="button"
                                        onClick={() => setPosition(pos.id as any)}
                                        className={`p-2 text-sm rounded border text-center transition-all ${
                                            position === pos.id
                                                ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                                                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {pos.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Number Format</label>
                                <select
                                    value={format}
                                    onChange={(e) => setFormat(e.target.value as any)}
                                    className="w-full p-2.5 border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="number">1, 2, 3...</option>
                                    <option value="page_x">Page 1, Page 2...</option>
                                    <option value="page_x_of_y">Page 1 of N</option>
                                    <option value="x_slash_y">1 / N</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Start Numbering At</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={startNum}
                                    onChange={(e) => setStartNum(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={addNumbers}
                        className="w-full btn btn-primary btn-lg flex items-center justify-center gap-2"
                    >
                        Add Page Numbers <ArrowRight size={20} />
                    </button>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Adding page numbers..." />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={`numbered_${file?.name}`}
                    onReset={reset}
                    message="Page numbers added successfully!"
                />
            )}
        </div>
    );
}
