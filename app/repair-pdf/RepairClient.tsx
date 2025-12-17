"use client";
import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { Wrench, arrowRight } from 'lucide-react';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import ToolSeoContent from '@/components/ToolSeoContent';

// Note: In Client Components, metadata export is not supported. 
// For full SEO, we should ideally wrap this. But for speed/user request, we'll keep it simple or do the layout.js pattern.
// Let's stick to the Pattern: page.tsx (Server) -> ClientComponent. 
// But here I'll combine for speed as user just wants pages. 
// WAIT: I should stick to the pattern I established (page.tsx = Server, Client.tsx = Client) to get the metadata.
// I'll write this file as the CLIENT component for Repair, then write the page.tsx.

export default function RepairClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

    const handleFilesSelected = (files: File[]) => {
        if (files.length > 0) setFile(files[0]);
    };

    const repairPdf = async () => {
        if (!file) return;
        setStatus('PROCESSING');
        try {
            // "Repair" by loading (which fixes XRef) and saving.
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error) {
            console.error('Error repairing:', error);
            alert('Could not repair this file. It may be too damaged.');
            setStatus('IDLE');
        }
    };

    const reset = () => {
        setFile(null); setStatus('IDLE'); setDownloadUrl(null);
    };

    return (
        <div className="container text-center">
            <h1 className="text-4xl font-bold mt-8 mb-4">Repair PDF</h1>
            <p className="text-muted mb-8">Recover data from a corrupted or damaged PDF document.</p>

            {status === 'IDLE' && !file && <FileUploader onFilesSelected={handleFilesSelected} />}

            {status === 'IDLE' && file && (
                <div className="max-w-md mx-auto bg-gray-50 p-6 rounded-lg mt-8">
                    <p className="mb-4 font-semibold">{file.name}</p>
                    <button onClick={repairPdf} className="btn btn-primary w-full">Repair PDF</button>
                    <button onClick={reset} className="text-sm text-gray-500 mt-4 underline">Change File</button>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Repairing PDF..." />}
            {status === 'DONE' && downloadUrl && <DownloadResult downloadUrl={downloadUrl} downloadFilename={`repaired_${file?.name}`} onReset={reset} />}
        </div>
    );
}
