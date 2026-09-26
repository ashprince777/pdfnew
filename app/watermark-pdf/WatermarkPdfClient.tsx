"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { Stamp, ArrowRight, Trash2 } from 'lucide-react';

import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

export default function WatermarkPdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');

    const handleFilesSelected = (newFiles: File[]) => {
        if (newFiles.length > 0) setFile(newFiles[0]);
    };

    const removeFile = () => {
        setFile(null);
        setWatermarkText('CONFIDENTIAL');
    };

    const applyWatermark = async () => {
        if (!file) return;

        setStatus('PROCESSING');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const rawText = watermarkText.trim() || 'CONFIDENTIAL';
            const text = rawText
                .replace(/[\u201C\u201D]/g, '"')
                .replace(/[\u2018\u2019]/g, "'")
                .replace(/[\u2013\u2014]/g, '-')
                .replace(/[\u2022\u00B7]/g, '* ')
                .replace(/[^\x00-\xFF]/g, ' ');

            const pages = pdfDoc.getPages();
            for (const page of pages) {
                const { width, height } = page.getSize();
                const fontSize = Math.max(24, Math.min(width, height) / 10);
                const textWidth = font.widthOfTextAtSize(text, fontSize);
                const textHeight = font.heightAtSize(fontSize);

                // Center coordinates accounting for 45 deg rotation
                const rad = (45 * Math.PI) / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);
                const cx = width / 2;
                const cy = height / 2;
                const x = cx - (textWidth * cos - textHeight * sin) / 2;
                const y = cy - (textWidth * sin + textHeight * cos) / 2;

                page.drawText(text, {
                    x,
                    y,
                    size: fontSize,
                    font,
                    color: rgb(0.8, 0.1, 0.1),
                    opacity: 0.3,
                    rotate: degrees(45),
                });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

            if (downloadUrl) URL.revokeObjectURL(downloadUrl);

            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error) {
            console.error('Error applying watermark:', error);
            alert('Failed to apply watermark. Please try again.');
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
                <h1 className="text-4xl font-bold mb-4">Add Watermark to PDF</h1>
                <p className="text-muted mb-8 text-lg">Stamp your documents with text or images.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} multiple={false} accept=".pdf" />
            )}

            {status === 'IDLE' && file && (
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-100 p-3 rounded-lg">
                                    <Stamp className="text-blue-600 w-8 h-8" />
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
                                Watermark Text
                            </label>
                            <input
                                type="text"
                                value={watermarkText}
                                onChange={(e) => setWatermarkText(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Enter text (e.g., DRAFT)"
                            />
                        </div>

                        <div className="p-12 border-2 border-dashed rounded-lg bg-gray-50 flex items-center justify-center mb-6 relative overflow-hidden">
                            <p className="text-gray-400 font-bold text-4xl transform -rotate-12 opacity-20 select-none">
                                {watermarkText || 'WATERMARK'}
                            </p>
                            <p className="absolute bottom-2 right-2 text-xs text-gray-400">Preview</p>
                        </div>

                        <button
                            onClick={applyWatermark}
                            className="w-full btn btn-primary btn-lg flex items-center justify-center gap-2"
                        >
                            Apply Watermark <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Applying watermark..." />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={`watermarked_${file?.name}`}
                    onReset={reset}
                />
            )}
        </div>
    );
}
