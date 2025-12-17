"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { FileImage, ArrowRight, Trash2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

export default function JpgToPdfClient() {
    const [files, setFiles] = useState<File[]>([]);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

    const handleFilesSelected = (newFiles: File[]) => {
        setFiles((prev) => [...prev, ...newFiles]);
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const convertToPdf = async () => {
        if (files.length === 0) return;

        setStatus('PROCESSING');

        try {
            const pdfDoc = await PDFDocument.create();

            for (const file of files) {
                const arrayBuffer = await file.arrayBuffer();
                const image = await pdfDoc.embedJpg(arrayBuffer);
                const page = pdfDoc.addPage([image.width, image.height]);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: image.width,
                    height: image.height,
                });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error) {
            console.error('Error converting images to PDF:', error);
            alert('An error occurred during conversion.');
            setStatus('IDLE');
        }
    };

    const reset = () => {
        setFiles([]);
        setStatus('IDLE');
        setDownloadUrl(null);
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1 className="text-4xl font-bold mb-4">JPG to PDF</h1>
                <p className="text-muted mb-8 text-lg">Convert your images to a single PDF document.</p>
            </div>

            {status === 'IDLE' && files.length === 0 && (
                <FileUploader onFilesSelected={handleFilesSelected} multiple={true} accept=".jpg,.jpeg,.png" />
            )}

            {status === 'IDLE' && files.length > 0 && (
                <div className="max-w-2xl mx-auto">
                    <div className="grid gap-2 mb-6">
                        {files.map((file, index) => (
                            <div key={index} className="bg-white p-4 rounded-lg shadow-sm border flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-purple-100 p-2 rounded-lg">
                                        <FileImage className="text-purple-600 w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-sm truncate max-w-[200px]">{file.name}</h3>
                                        <p className="text-gray-500 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFile(index)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-red-500"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center flex-col items-center gap-4">
                        <FileUploader onFilesSelected={handleFilesSelected} multiple={true} accept=".jpg,.jpeg,.png" />

                        <button
                            onClick={convertToPdf}
                            className="btn btn-primary btn-lg flex items-center gap-2 px-8 py-4 text-xl mt-4"
                        >
                            Convert to PDF <ArrowRight size={24} />
                        </button>
                    </div>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Converting images to PDF..." />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename="converted_images.pdf"
                    onReset={reset}
                />
            )}
        </div>
    );
}
