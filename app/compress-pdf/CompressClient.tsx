"use client";
import { useState } from 'react';
import Link from 'next/link';
import { PDFDocument } from '@cantoo/pdf-lib';
import { Minimize2 } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, ChoiceGroup, PrimaryAction, Notice, toolStyles } from '@/components/ToolUI';
import { baseName, formatBytes, loadPdf, pdfBytesToBlob } from '@/lib/pdf';
import { openPdfjsDocument, renderPageToCanvas, canvasToBlob, releaseCanvas } from '@/lib/pdfjs';
import { recompressImages } from '@/lib/compress';
import { useToolRunner } from '@/lib/useToolRunner';
import { SIZE_PRESETS_KB, sizeLabel, sizeSlug } from '@/lib/compressSizes';

type Level = 'light' | 'recommended' | 'extreme' | 'target';

const LEVELS: { value: Level; title: string; text: string }[] = [
    { value: 'light', title: 'Light', text: 'High image quality, smaller savings' },
    { value: 'recommended', title: 'Recommended', text: 'Good quality, good compression' },
    { value: 'extreme', title: 'Extreme', text: 'Smallest file. Pages become images' },
    { value: 'target', title: 'Fit to a size', text: 'e.g. under 200 KB for forms' },
];

const IMAGE_SETTINGS: Record<'light' | 'recommended', { maxDimension: number; quality: number }> = {
    light: { maxDimension: 2400, quality: 0.82 },
    recommended: { maxDimension: 1600, quality: 0.68 },
};

/** Strongest-last steps tried when fitting a PDF under a target size. Image steps keep text selectable. */
const IMAGE_LADDER = [
    { maxDimension: 2000, quality: 0.75 },
    { maxDimension: 1600, quality: 0.62 },
    { maxDimension: 1200, quality: 0.5 },
    { maxDimension: 900, quality: 0.4 },
    { maxDimension: 700, quality: 0.3 },
];
const RASTER_LADDER = [
    { scale: 1.25, quality: 0.55 },
    { scale: 1.05, quality: 0.45 },
    { scale: 0.9, quality: 0.38 },
    { scale: 0.75, quality: 0.3 },
    { scale: 0.62, quality: 0.25 },
    { scale: 0.5, quality: 0.2 },
    { scale: 0.4, quality: 0.16 },
];

/** Rebuilds every page as a JPEG. Used for "Extreme" and as the last resort when fitting a size. */
async function rasterizePdf(bytes: ArrayBuffer, scale: number, quality: number, onProgress: (message: string) => void): Promise<Uint8Array> {
    const srcDoc = await openPdfjsDocument(bytes);
    const newPdf = await PDFDocument.create();
    for (let i = 1; i <= srcDoc.numPages; i++) {
        onProgress(`Compressing page ${i} of ${srcDoc.numPages}...`);
        const page = await srcDoc.getPage(i);
        const canvas = await renderPageToCanvas(page, scale);
        const jpeg = await canvasToBlob(canvas, 'image/jpeg', quality);
        releaseCanvas(canvas);
        const image = await newPdf.embedJpg(await jpeg.arrayBuffer());
        const { width, height } = page.getViewport({ scale: 1 });
        newPdf.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
        page.cleanup();
    }
    await srcDoc.destroy();
    return newPdf.save();
}

async function recompress(bytes: ArrayBuffer, settings: { maxDimension: number; quality: number }, onProgress: (message: string) => void): Promise<Uint8Array> {
    const pdfDoc = await loadPdf(bytes);
    await recompressImages(pdfDoc, { ...settings, onProgress: (done, total) => onProgress(`Optimizing image ${done} of ${total}...`) });
    onProgress('Saving optimized PDF...');
    return pdfDoc.save({ useObjectStreams: true });
}

/**
 * Tries progressively stronger settings and returns the first result under `targetBytes`, so the
 * file keeps as much quality as the limit allows. Pages are only turned into images if needed.
 */
async function compressToSize(file: File, targetBytes: number, onProgress: (message: string) => void): Promise<{ bytes: Uint8Array; rasterized: boolean; reached: boolean }> {
    const original = await file.arrayBuffer();
    let best: { bytes: Uint8Array; rasterized: boolean } | null = null;
    const consider = (bytes: Uint8Array, rasterized: boolean) => {
        if (!best || bytes.length < best.bytes.length) best = { bytes, rasterized };
        return bytes.length <= targetBytes;
    };
    for (let i = 0; i < IMAGE_LADDER.length; i++) {
        const bytes = await recompress(original.slice(0), IMAGE_LADDER[i], (m) => onProgress(`Step ${i + 1}: ${m}`));
        if (consider(bytes, false)) return { bytes, rasterized: false, reached: true };
    }
    for (let i = 0; i < RASTER_LADDER.length; i++) {
        const { scale, quality } = RASTER_LADDER[i];
        const bytes = await rasterizePdf(original.slice(0), scale, quality, (m) => onProgress(`Step ${IMAGE_LADDER.length + i + 1}: ${m}`));
        if (consider(bytes, true)) return { bytes, rasterized: true, reached: true };
    }
    const smallest = best as unknown as { bytes: Uint8Array; rasterized: boolean };
    return { ...smallest, reached: false };
}

export default function CompressClient({ defaultTargetKb }: { defaultTargetKb?: number } = {}) {
    const [file, setFile] = useState<File | null>(null);
    const [level, setLevel] = useState<Level>(defaultTargetKb ? 'target' : 'recommended');
    const [targetKb, setTargetKb] = useState<number>(defaultTargetKb ?? 200);
    const [message, setMessage] = useState('');
    const tool = useToolRunner();

    const targetBytes = Math.max(10, targetKb || 0) * 1024;

    const compressPdf = () => {
        if (!file) return;
        tool.run(async () => {
            const filename = `${baseName(file.name)}_compressed.pdf`;

            if (level === 'target') {
                if (file.size <= targetBytes) {
                    setMessage(`Your PDF is already ${formatBytes(file.size)}, which is under ${sizeLabel(targetKb)}. No compression needed.`);
                    return { blob: file.slice(0, file.size, 'application/pdf'), filename };
                }
                const { bytes, rasterized, reached } = await compressToSize(file, targetBytes, tool.setProgress);
                const note = rasterized ? ' To fit, pages were saved as images, so text is no longer selectable.' : ' Text stays sharp and selectable.';
                setMessage(
                    reached
                        ? `Done! ${formatBytes(file.size)} → ${formatBytes(bytes.length)}, under your ${sizeLabel(targetKb)} limit.${note}`
                        : `This PDF could not be made smaller than ${formatBytes(bytes.length)} without becoming unreadable. Try splitting it into parts (Split PDF) or removing pages.`
                );
                return { blob: pdfBytesToBlob(bytes), filename };
            }

            const bytes = level === 'extreme' ? await rasterizePdf(await file.arrayBuffer(), 1.25, 0.5, tool.setProgress) : await recompress(await file.arrayBuffer(), IMAGE_SETTINGS[level], tool.setProgress);
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

    const title = defaultTargetKb ? `Compress PDF to ${sizeLabel(defaultTargetKb)}` : 'Compress PDF File';
    const subtitle = defaultTargetKb
        ? `Reduce your PDF to under ${sizeLabel(defaultTargetKb)} for online forms, exam applications and email, without uploading it anywhere.`
        : 'Reduce the file size of your PDF while keeping text sharp and searchable.';

    return (
        <div className="container">
            <ToolHeader title={title} subtitle={subtitle} />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={(files) => setFile(files[0] ?? null)} />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace>
                    <SelectedFile file={file} onRemove={reset} icon={Minimize2} />

                    <OptionsCard title="Compression level">
                        <ChoiceGroup label="Compression level" options={LEVELS} value={level} onChange={setLevel} />
                        {level === 'target' && (
                            <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                                <label className={toolStyles.label} htmlFor="target-kb">Maximum file size (KB)</label>
                                <input
                                    id="target-kb"
                                    type="number"
                                    min={10}
                                    step={10}
                                    value={targetKb}
                                    onChange={(e) => setTargetKb(parseInt(e.target.value) || 0)}
                                    className={toolStyles.input}
                                    style={{ maxWidth: 200 }}
                                />
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {SIZE_PRESETS_KB.map((kb) => (
                                        <button key={kb} type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 14 }} aria-pressed={targetKb === kb} onClick={() => setTargetKb(kb)}>
                                            {sizeLabel(kb)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </OptionsCard>

                    {level === 'extreme' ? (
                        <Notice tone="warning">
                            Extreme compression turns every page into an image. Text will no longer be selectable or
                            searchable, and links are removed. Best for scanned documents.
                        </Notice>
                    ) : level === 'target' ? (
                        <Notice>
                            We try gentle settings first and only go stronger if needed, so you get the best quality that still fits under{' '}
                            {sizeLabel(targetKb || 0)}. For very small limits, pages may be saved as images.
                        </Notice>
                    ) : (
                        <Notice>
                            Images are resampled and re-encoded; text, vector graphics, links and bookmarks stay intact.
                            Files that are mostly text may only shrink a little.
                        </Notice>
                    )}

                    <PrimaryAction onClick={compressPdf} disabled={level === 'target' && targetKb < 10}>
                        Compress PDF <Minimize2 size={20} />
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'IDLE' && (
                <p style={{ textAlign: 'center', marginTop: 20, fontSize: 'var(--text-sm)', color: 'var(--text-light)' }}>
                    Compress to a specific size:{' '}
                    {SIZE_PRESETS_KB.map((kb, i) => (
                        <span key={kb}>
                            {i > 0 && ' · '}
                            <Link href={`/compress-pdf-to-${sizeSlug(kb)}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                {sizeLabel(kb)}
                            </Link>
                        </span>
                    ))}
                </p>
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
