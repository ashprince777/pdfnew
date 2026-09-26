"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { Presentation, ArrowRight } from 'lucide-react';

export default function PdfToPowerpointClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [filename, setFilename] = useState('');

    const handleFilesSelected = (files: File[]) => {
        if (files.length > 0) setFile(files[0]);
    };

    const convertToPpt = async () => {
        if (!file) return;
        setStatus('PROCESSING');

        try {
            // Dynamic import to avoid SSR issues
            const pdfjsLib = await import('pdfjs-dist');
            // @ts-ignore
            const PptxGenJS = (await import('pptxgenjs')).default;
            const pptx = new PptxGenJS();

            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdfDoc = await loadingTask.promise;
            const totalPages = pdfDoc.numPages;

            for (let i = 1; i <= totalPages; i++) {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (context) {
                    await page.render({ canvasContext: context, viewport } as any).promise;

                    const imgData = canvas.toDataURL('image/jpeg', 0.8);

                    const slide = pptx.addSlide();
                    slide.addImage({
                        data: imgData,
                        x: 0,
                        y: 0,
                        w: '100%',
                        h: '100%'
                    });
                }
            }

            const blob = await pptx.write({ outputType: 'blob' }) as Blob;
            if (downloadUrl) URL.revokeObjectURL(downloadUrl);
            const url = URL.createObjectURL(blob);

            setDownloadUrl(url);
            setFilename(`${file.name.replace(/\.[^/.]+$/, '')}.pptx`);
            setStatus('DONE');

        } catch (error) {
            console.error('Error converting PDF to PPT:', error);
            alert('An error occurred during conversion.');
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
                <h1 className="text-4xl font-bold mb-4">PDF to PowerPoint</h1>
                <p className="text-muted mb-8 text-lg">Convert your PDF files to PPTX presentation slides.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} accept=".pdf" />
            )}

            {status === 'IDLE' && file && (
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div style={{ backgroundColor: '#fff0ec', padding: '12px', borderRadius: '8px' }}>
                                <Presentation className="w-8 h-8" style={{ color: '#d24726' }} />
                            </div>
                            <div>
                                <h3 className="font-medium text-lg">{file.name}</h3>
                                <p className="text-gray-500 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        </div>
                        <button
                            onClick={reset}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-red-500"
                        >
                            Change
                        </button>
                    </div>

                    <div className="alert alert-info text-center mb-4">
                        Note: This tool converts PDF pages into slide images. Text will not be editable.
                    </div>

                    <div className="flex justify-center">
                        <button onClick={convertToPpt} className="btn btn-primary btn-lg flex items-center gap-2 px-8 py-4 text-xl">
                            Convert to PowerPoint <ArrowRight size={24} />
                        </button>
                    </div>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Converting to PowerPoint..." />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={filename}
                    onReset={reset}
                    message="Your PowerPoint presentation is ready!"
                />
            )}
        </div>
    );
}
