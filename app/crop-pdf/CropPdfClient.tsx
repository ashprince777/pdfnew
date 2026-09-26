"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { Crop, ArrowRight, Trash2, FileText } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

export default function CropPdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [marginTop, setMarginTop] = useState<number>(36);
    const [marginBottom, setMarginBottom] = useState<number>(36);
    const [marginLeft, setMarginLeft] = useState<number>(36);
    const [marginRight, setMarginRight] = useState<number>(36);
    const [preset, setPreset] = useState<'custom' | 'small' | 'medium' | 'large'>('medium');

    const handleFilesSelected = (newFiles: File[]) => {
        if (newFiles.length > 0) setFile(newFiles[0]);
    };

    const handlePresetChange = (selected: 'custom' | 'small' | 'medium' | 'large') => {
        setPreset(selected);
        if (selected === 'small') {
            setMarginTop(20);
            setMarginBottom(20);
            setMarginLeft(20);
            setMarginRight(20);
        } else if (selected === 'medium') {
            setMarginTop(36);
            setMarginBottom(36);
            setMarginLeft(36);
            setMarginRight(36);
        } else if (selected === 'large') {
            setMarginTop(60);
            setMarginBottom(60);
            setMarginLeft(60);
            setMarginRight(60);
        }
    };

    const cropPdf = async () => {
        if (!file) return;

        setStatus('PROCESSING');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const pages = pdfDoc.getPages();

            for (const page of pages) {
                const box = page.getCropBox() || page.getMediaBox();
                const newX = box.x + marginLeft;
                const newY = box.y + marginBottom;
                const newWidth = Math.max(50, box.width - marginLeft - marginRight);
                const newHeight = Math.max(50, box.height - marginTop - marginBottom);

                page.setCropBox(newX, newY, newWidth, newHeight);
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

            if (downloadUrl) URL.revokeObjectURL(downloadUrl);

            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error) {
            console.error('Error cropping PDF:', error);
            alert('Failed to crop PDF. Please check the margin values.');
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
                <h1 className="text-4xl font-bold mb-4">Crop PDF Online</h1>
                <p className="text-muted mb-8 text-lg">Trim margins and crop pages of your PDF document with precision.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} multiple={false} accept=".pdf" />
            )}

            {status === 'IDLE' && file && (
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="bg-white p-5 rounded-lg border shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-100 rounded-lg text-blue-600">
                                <Crop size={24} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-800">{file.name}</h3>
                                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        </div>
                        <button onClick={reset} className="text-gray-400 hover:text-red-500 p-2">
                            <Trash2 size={20} />
                        </button>
                    </div>

                    {/* Presets */}
                    <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
                        <h4 className="font-semibold text-gray-800 border-b pb-2">Crop Margins (points)</h4>

                        <div className="flex gap-2">
                            {(['small', 'medium', 'large', 'custom'] as const).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => handlePresetChange(p)}
                                    className={`flex-1 py-2 text-sm rounded-md capitalize font-medium border ${
                                        preset === p ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-600'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Top</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={marginTop}
                                    onChange={(e) => {
                                        setMarginTop(Math.max(0, parseInt(e.target.value) || 0));
                                        setPreset('custom');
                                    }}
                                    className="w-full p-2 border rounded text-center text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Bottom</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={marginBottom}
                                    onChange={(e) => {
                                        setMarginBottom(Math.max(0, parseInt(e.target.value) || 0));
                                        setPreset('custom');
                                    }}
                                    className="w-full p-2 border rounded text-center text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Left</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={marginLeft}
                                    onChange={(e) => {
                                        setMarginLeft(Math.max(0, parseInt(e.target.value) || 0));
                                        setPreset('custom');
                                    }}
                                    className="w-full p-2 border rounded text-center text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Right</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={marginRight}
                                    onChange={(e) => {
                                        setMarginRight(Math.max(0, parseInt(e.target.value) || 0));
                                        setPreset('custom');
                                    }}
                                    className="w-full p-2 border rounded text-center text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={cropPdf}
                        className="w-full btn btn-primary btn-lg flex items-center justify-center gap-2 py-4 text-xl"
                    >
                        Crop PDF <ArrowRight size={22} />
                    </button>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Cropping PDF pages..." />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={`cropped_${file?.name}`}
                    onReset={reset}
                    message="PDF cropped successfully!"
                />
            )}
        </div>
    );
}
