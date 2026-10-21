"use client";
import { useState } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
import { Minimize2 } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, ChoiceGroup, PrimaryAction, Notice } from '@/components/ToolUI';
import { baseName, formatBytes, loadPdf, pdfBytesToBlob } from '@/lib/pdf';
import { openPdfjsDocument, renderPageToCanvas, canvasToBlob, releaseCanvas } from '@/lib/pdfjs';
import { recompressImages } from '@/lib/compress';
import { useToolRunner } from '@/lib/useToolRunner';

type Level = 'light' | 'recommended' | 'extreme';

const LEVELS: { value: Level; title: string; text: string }[] = [
    { value: 'light', title: 'Light', text: 'High image quality, smaller savings' },
    { value: 'recommended', title: 'Recommended', text: 'Good quality, good compression' },
    { value: 'extreme', title: 'Extreme', text: 'Smallest file. Pages become images' },
];

const IMAGE_SETTINGS: Record<Exclude<Level, 'extreme'>, { maxDimension: number; quality: number }> = {
    light: { maxDimension: 2400, quality: 0.82 },
    recommended: { maxDimension: 1600, quality: 0.68 },
};

/** Rebuilds every page as a JPEG. Only used for the explicit "Extreme" level. */
async function rasterizePdf(file: File, onProgress: (message: string) => void): Promise<Uint8Array> {
    const srcDoc = await openPdfjsDocument(await file.arrayBuffer());
    const newPdf = await PDFDocument.create();
    for (let i = 1; i <= srcDoc.numPages; i++) {
        onProgress(`Compressing page ${i} of ${srcDoc.numPages}...`);
        const page = await srcDoc.getPage(i);
        const canvas = await renderPageToCanvas(page, 1.25);
        const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.5);
        releaseCanvas(canvas);
        const image = await newPdf.embedJpg(await jpeg.arrayBuffer());
        const { width, height } = page.getViewport({ scale: 1 });
        newPdf.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
        page.cleanup();
    }
    await srcDoc.destroy();
    return newPdf.save();
}

export default function CompressClient() {
    const [file, setFile] = useState<File | null>(null);
    const [level, setLevel] = useState<Level>('recommended');
    const [message, setMessage] = useState('');
    const tool = useToolRunner();

    const compressPdf = () => {
        if (!file) return;
        tool.run(async () => {
            let bytes: Uint8Array;
            if (level === 'extreme') {
                bytes = await rasterizePdf(file, tool.setProgress);
            } else {
                const pdfDoc = await loadPdf(file);
                await recompressImages(pdfDoc, {
                    ...IMAGE_SETTINGS[level],
                    onProgress: (done, total) => tool.setProgress(`Optimizing image ${done} of ${total}...`),
                });
                tool.setProgress('Saving optimized PDF...');
                bytes = await pdfDoc.save({ useObjectStreams: true });
            }

            const filename = `${baseName(file.name)}_compressed.pdf`;
            if (bytes.length >= file.size) {
                setMessage(`This PDF is already well optimized (${formatBytes(file.size)}). We kept the original so quality is not lost.`);
                return { blob: file.slice(0, file.size, 'application/pdf'), filename };
            }
            const saved = Math.round((1 - bytes.length / file.size) * 100);
            setMessage(`Compressed! ${formatBytes(file.size)} → ${formatBytes(bytes.length)} (${saved}% smaller)`);
            return { blob: pdfBytesToBlob(bytes), filename };
        }, 'An error occurred while compressing. Please try again.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
        setMessage('');
    };

    return (
        <div className="container">
            <ToolHeader title="Compress PDF File" subtitle="Reduce the file size of your PDF while keeping text sharp and searchable." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={(files) => setFile(files[0] ?? null)} />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace>
                    <SelectedFile file={file} onRemove={reset} icon={Minimize2} />

                    <OptionsCard title="Compression level">
                        <ChoiceGroup label="Compression level" options={LEVELS} value={level} onChange={setLevel} />
                    </OptionsCard>

                    {level === 'extreme' ? (
                        <Notice tone="warning">
                            Extreme compression turns every page into an image. Text will no longer be selectable or
                            searchable, and links are removed. Best for scanned documents.
                        </Notice>
                    ) : (
                        <Notice>
                            Images are resampled and re-encoded; text, vector graphics, links and bookmarks stay intact.
                            Files that are mostly text may only shrink a little.
                        </Notice>
                    )}

                    <PrimaryAction onClick={compressPdf}>
                        Compress PDF <Minimize2 size={20} />
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status={tool.progress || 'Compressing PDF...'} />}

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
