"use client";
import { useState } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
import { ShieldCheck, Wrench } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, PrimaryAction, Notice } from '@/components/ToolUI';
import { baseName, PdfToolError, pdfBytesToBlob } from '@/lib/pdf';
import { openPdfjsDocument, renderPageToCanvas, canvasToBlob, releaseCanvas } from '@/lib/pdfjs';
import { useToolRunner } from '@/lib/useToolRunner';

/** Re-parses every object (ignoring a broken xref table) and writes a clean file. */
async function rebuildStructure(bytes: Uint8Array): Promise<Uint8Array | null> {
    try {
        const doc = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: false });
        if (doc.isEncrypted) throw new PdfToolError('This PDF is encrypted. Unlock it first with the Unlock PDF tool, then repair it.', 'ENCRYPTED');
        if (doc.getPageCount() === 0) return null;
        return await doc.save();
    } catch (error) {
        if (error instanceof PdfToolError) throw error;
        return null;
    }
}

/** Last resort: let pdf.js (very tolerant of damage) render each page and rebuild from images. */
async function rebuildFromRender(bytes: Uint8Array, onProgress: (message: string) => void): Promise<Uint8Array> {
    const src = await openPdfjsDocument(bytes);
    const out = await PDFDocument.create();
    let rendered = 0;
    for (let i = 1; i <= src.numPages; i++) {
        onProgress(`Recovering page ${i} of ${src.numPages}...`);
        try {
            const page = await src.getPage(i);
            const canvas = await renderPageToCanvas(page, 2);
            const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.9);
            releaseCanvas(canvas);
            const image = await out.embedJpg(await jpeg.arrayBuffer());
            const { width, height } = page.getViewport({ scale: 1 });
            out.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
            rendered++;
        } catch (error) {
            console.warn(`Page ${i} could not be recovered`, error);
        }
    }
    await src.destroy();
    if (rendered === 0) throw new PdfToolError('No pages could be recovered. The file is too damaged to repair.');
    return out.save();
}

export default function RepairClient() {
    const [file, setFile] = useState<File | null>(null);
    const [message, setMessage] = useState('');
    const tool = useToolRunner();

    const repairPdf = () => {
        if (!file) return;
        tool.run(async () => {
            const bytes = new Uint8Array(await file.arrayBuffer());
            tool.setProgress('Rebuilding PDF structure...');
            let repaired = await rebuildStructure(bytes);
            if (repaired) {
                setMessage('PDF repaired! The document structure was rebuilt; text and links are preserved.');
            } else {
                repaired = await rebuildFromRender(bytes, tool.setProgress);
                setMessage('PDF recovered! The structure was too damaged, so pages were rebuilt as images (text is not selectable).');
            }
            return { blob: pdfBytesToBlob(repaired), filename: `${baseName(file.name)}_repaired.pdf` };
        }, 'Could not repair this file. It may be too damaged.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
        setMessage('');
    };

    return (
        <div className="container">
            <ToolHeader title="Repair PDF" subtitle="Recover a corrupted or damaged PDF document that won't open properly." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={(files) => setFile(files[0] ?? null)} />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace>
                    <SelectedFile file={file} onRemove={reset} icon={ShieldCheck} />
                    <Notice>
                        We first rebuild the file&apos;s internal structure (keeping text and links). If that is not possible,
                        we recover each readable page as an image.
                    </Notice>
                    <PrimaryAction onClick={repairPdf}>
                        <Wrench size={20} /> Repair PDF
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status={tool.progress || 'Repairing PDF...'} />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message={message}
                />
            )}
        </div>
    );
}
