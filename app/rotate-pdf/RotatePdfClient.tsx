"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { FileText, RotateCw, Trash2, ArrowRight } from 'lucide-react';

export default function RotatePdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [rotation, setRotation] = useState(0);

    const handleFilesSelected = (newFiles: File[]) => {
        if (newFiles.length > 0) setFile(newFiles[0]);
    };

    const removeFile = () => {
        setFile(null);
        setRotation(0);
    };

    const rotateAll = () => {
        setRotation((prev) => (prev + 90) % 360);
    };

    const applyRotation = async () => {
        if (!file) return;
        setStatus('PROCESSING');

        // Simulating the actual rotation save
        setTimeout(() => {
            alert("Rotation applied currently only in preview (Simulation). Saving functionality coming soon.");
            setStatus('IDLE');
        }, 1500);
    };

    const reset = () => {
        setFile(null);
        setStatus('IDLE');
        setDownloadUrl(null);
        setRotation(0);
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1 className="text-4xl font-bold mb-4">Rotate PDF</h1>
                <p className="text-muted mb-8 text-lg">Rotate your PDF pages permanently.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} multiple={false} accept=".pdf" />
            )}

            {status === 'IDLE' && file && (
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
                        <div className="flex items-center justify-between mb-6 border-b pb-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-100 p-2 rounded-lg">
                                    <FileText className="text-blue-600 w-6 h-6" />
                                </div>
                                <span className="font-medium">{file.name}</span>
                            </div>
                            <button onClick={removeFile} className="text-gray-400 hover:text-red-500">
                                <Trash2 />
                            </button>
                        </div>

                        <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded border-2 border-dashed mb-6">
                            <div
                                className="transition-transform duration-300"
                                style={{ transform: `rotate(${rotation}deg)` }}
                            >
                                <FileText size={80} className="text-gray-400" />
                            </div>
                            <p className="mt-4 text-gray-500">Preview Rotation: {rotation}°</p>
                        </div>

                        <div className="flex justify-center gap-4">
                            <button
                                onClick={rotateAll}
                                className="btn btn-outline flex items-center gap-2"
                            >
                                <RotateCw size={18} /> Rotate Right
                            </button>
                            <button
                                onClick={applyRotation}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                Save PDF <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Rotating pages..." />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename="rotated.pdf"
                    onReset={reset}
                />
            )}
        </div>
    );
}
