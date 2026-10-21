"use client";
import { useState } from 'react';
import { Presentation, ArrowRight } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, PrimaryAction, Notice } from '@/components/ToolUI';
import { baseName } from '@/lib/pdf';
import { canvasToBlob, openPdfjsDocument, releaseCanvas, renderPageToCanvas } from '@/lib/pdfjs';
import { useToolRunner } from '@/lib/useToolRunner';
import { removeDanglingContentTypes } from '@/lib/ooxml';
import JSZip from 'jszip';

const SLIDE_WIDTH_IN = 10;
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

export default function PdfToPowerpointClient() {
    const [file, setFile] = useState<File | null>(null);
    const tool = useToolRunner();

    const convertToPpt = () => {
        if (!file) return;
        tool.run(async () => {
            const [{ default: PptxGenJS }, pdfDoc] = await Promise.all([import('pptxgenjs'), openPdfjsDocument(await file.arrayBuffer())]);
            const pptx = new PptxGenJS();

            // Match the slide shape to the first page so pages are not stretched.
            const first = (await pdfDoc.getPage(1)).getViewport({ scale: 1 });
            const slideHeight = SLIDE_WIDTH_IN * (first.height / first.width);
            pptx.defineLayout({ name: 'PDF', width: SLIDE_WIDTH_IN, height: slideHeight });
            pptx.layout = 'PDF';

            for (let i = 1; i <= pdfDoc.numPages; i++) {
                tool.setProgress(`Converting page ${i} of ${pdfDoc.numPages}...`);
                const page = await pdfDoc.getPage(i);
                const base = page.getViewport({ scale: 1 });
                const canvas = await renderPageToCanvas(page, 2);
                const data = await blobToDataUrl(await canvasToBlob(canvas, 'image/jpeg', 0.85));
                releaseCanvas(canvas);
                page.cleanup();

                // Fit (contain) pages whose shape differs from the first one.
                const scale = Math.min(SLIDE_WIDTH_IN / base.width, slideHeight / base.height);
                const w = base.width * scale;
                const h = base.height * scale;
                pptx.addSlide().addImage({ data, x: (SLIDE_WIDTH_IN - w) / 2, y: (slideHeight - h) / 2, w, h });
            }
            await pdfDoc.destroy();

            tool.setProgress('Building PowerPoint file...');
            const zip = await JSZip.loadAsync((await pptx.write({ outputType: 'arraybuffer' })) as ArrayBuffer);
            await removeDanglingContentTypes(zip);
            const blob = await zip.generateAsync({ type: 'blob', mimeType: PPTX_MIME });
            return { blob, filename: `${baseName(file.name)}.pptx` };
        }, 'An error occurred during conversion.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
    };

    return (
        <div className="container">
            <ToolHeader title="PDF to PowerPoint" subtitle="Turn each PDF page into a PowerPoint slide." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={(files) => setFile(files[0] ?? null)} accept=".pdf" />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace>
                    <SelectedFile file={file} onRemove={reset} icon={Presentation} />
                    <Notice>Each page becomes a full-slide image, so the layout looks exactly like the PDF. Text on the slides is not editable.</Notice>
                    <PrimaryAction onClick={convertToPpt}>
                        Convert to PowerPoint <ArrowRight size={22} />
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status={tool.progress || 'Converting to PowerPoint...'} />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="Your PowerPoint presentation is ready!"
                />
            )}
        </div>
    );
}
