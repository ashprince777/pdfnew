"use client";
import { useEffect, useRef, useState } from 'react';
import { PDFDocument, type PDFImage } from '@cantoo/pdf-lib';
import { ArrowRight, ArrowUp, ArrowDown, Trash2, GripVertical } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import ReorderableList from '@/components/ReorderableList';
import { ToolHeader, ToolWorkspace, OptionsCard, ChoiceGroup, PrimaryAction, toolStyles } from '@/components/ToolUI';
import { formatBytes, PdfToolError, savePdf } from '@/lib/pdf';
import { useToolRunner } from '@/lib/useToolRunner';

type PageSize = 'fit' | 'a4' | 'letter';
type Margin = 'none' | 'small' | 'large';

const PAGE_SIZES: Record<Exclude<PageSize, 'fit'>, [number, number]> = { a4: [595.28, 841.89], letter: [612, 792] };
const MARGINS: Record<Margin, number> = { none: 0, small: 20, large: 48 };
const ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.bmp';

interface ImageItem {
    id: string;
    file: File;
    previewUrl: string;
}

let nextId = 0;

/** Reads the EXIF orientation of a JPEG (1 = upright). */
function jpegOrientation(bytes: Uint8Array): number {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return 1;
    let offset = 2;
    while (offset + 4 < view.byteLength) {
        const marker = view.getUint16(offset);
        const size = view.getUint16(offset + 2);
        if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966) {
            const tiff = offset + 10;
            const little = view.getUint16(tiff) === 0x4949;
            const ifd = tiff + view.getUint32(tiff + 4, little);
            const entries = view.getUint16(ifd, little);
            for (let i = 0; i < entries; i++) {
                const entry = ifd + 2 + i * 12;
                if (entry + 10 > view.byteLength) break;
                if (view.getUint16(entry, little) === 0x0112) return view.getUint16(entry + 8, little);
            }
            return 1;
        }
        if ((marker & 0xff00) !== 0xff00) break;
        offset += 2 + size;
    }
    return 1;
}

/** Re-encodes through a canvas; browsers apply EXIF orientation when decoding. */
async function reencodeAsJpeg(file: File): Promise<ArrayBuffer> {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    canvas.width = canvas.height = 0;
    if (!blob) throw new Error('Could not encode image');
    return blob.arrayBuffer();
}

async function embedImage(pdfDoc: PDFDocument, file: File): Promise<PDFImage> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
    try {
        if (isPng) return await pdfDoc.embedPng(bytes);
        if (isJpeg && jpegOrientation(bytes) === 1) return await pdfDoc.embedJpg(bytes);
    } catch {
        // fall through to the canvas path for unusual encodings
    }
    try {
        return await pdfDoc.embedJpg(await reencodeAsJpeg(file));
    } catch {
        throw new PdfToolError(`"${file.name}" could not be read as an image.`);
    }
}

export default function JpgToPdfClient() {
    const [items, setItems] = useState<ImageItem[]>([]);
    const [pageSize, setPageSize] = useState<PageSize>('a4');
    const [margin, setMargin] = useState<Margin>('small');
    const tool = useToolRunner();

    const itemsRef = useRef(items);
    useEffect(() => {
        itemsRef.current = items;
    }, [items]);
    // Release preview URLs when the component unmounts.
    useEffect(() => () => itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl)), []);

    const handleFilesSelected = (files: File[]) => {
        setItems((prev) => [...prev, ...files.map((file) => ({ id: `img-${++nextId}`, file, previewUrl: URL.createObjectURL(file) }))]);
    };

    const removeItem = (id: string) => {
        const item = items.find((i) => i.id === id);
        if (item) URL.revokeObjectURL(item.previewUrl);
        setItems((prev) => prev.filter((i) => i.id !== id));
    };

    const convertToPdf = () => {
        if (items.length === 0) return;
        tool.run(async () => {
            const pdfDoc = await PDFDocument.create();
            for (let i = 0; i < items.length; i++) {
                tool.setProgress(`Adding image ${i + 1} of ${items.length}...`);
                const image = await embedImage(pdfDoc, items[i].file);
                const m = MARGINS[margin];

                if (pageSize === 'fit') {
                    // 96 DPI: a 1920px wide image becomes a 20-inch page instead of 26 inches.
                    const w = image.width * 0.75;
                    const h = image.height * 0.75;
                    pdfDoc.addPage([w + 2 * m, h + 2 * m]).drawImage(image, { x: m, y: m, width: w, height: h });
                    continue;
                }

                const [shortSide, longSide] = PAGE_SIZES[pageSize];
                const landscape = image.width > image.height;
                const [pw, ph] = landscape ? [longSide, shortSide] : [shortSide, longSide];
                const scale = Math.min((pw - 2 * m) / image.width, (ph - 2 * m) / image.height);
                const w = image.width * scale;
                const h = image.height * scale;
                pdfDoc.addPage([pw, ph]).drawImage(image, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
            }
            tool.setProgress('Saving PDF...');
            return { blob: await savePdf(pdfDoc), filename: items.length === 1 ? `${items[0].file.name.replace(/\.[^/.]+$/, '')}.pdf` : 'images.pdf' };
        }, 'An error occurred during conversion.');
    };

    const reset = () => {
        tool.reset();
        items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        setItems([]);
    };

    return (
        <div className="container">
            <ToolHeader title="JPG to PDF" subtitle="Convert JPG, PNG and other images into a single PDF, in the order you choose." />

            {tool.status === 'IDLE' && items.length === 0 && <FileUploader onFilesSelected={handleFilesSelected} multiple accept={ACCEPT} />}

            {tool.status === 'IDLE' && items.length > 0 && (
                <ToolWorkspace>
                    <ReorderableList
                        label="Images"
                        items={items}
                        getKey={(item) => item.id}
                        onReorder={setItems}
                        renderItem={(item, controls) => (
                            <div className={`${toolStyles.card} ${toolStyles.fileCard}`} style={{ padding: '10px 12px', marginBottom: 8, cursor: 'grab' }}>
                                <div className={toolStyles.fileMeta}>
                                    <GripVertical size={18} style={{ color: 'var(--text-light)', flexShrink: 0 }} aria-hidden="true" />
                                    {/* eslint-disable-next-line @next/next/no-img-element -- local blob: URL */}
                                    <img src={item.previewUrl} alt="" draggable={false} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                                    <div style={{ minWidth: 0 }}>
                                        <p className={toolStyles.fileName}>{controls.index + 1}. {item.file.name}</p>
                                        <p className={toolStyles.fileDetail}>{formatBytes(item.file.size)}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexShrink: 0 }}>
                                    <button type="button" className={toolStyles.iconButton} onClick={controls.moveUp} disabled={controls.isFirst} aria-label={`Move ${item.file.name} up`}>
                                        <ArrowUp size={18} />
                                    </button>
                                    <button type="button" className={toolStyles.iconButton} onClick={controls.moveDown} disabled={controls.isLast} aria-label={`Move ${item.file.name} down`}>
                                        <ArrowDown size={18} />
                                    </button>
                                    <button type="button" className={toolStyles.iconButton} onClick={() => removeItem(item.id)} aria-label={`Remove ${item.file.name}`}>
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    />

                    <FileUploader onFilesSelected={handleFilesSelected} multiple accept={ACCEPT} variant="compact" />

                    <OptionsCard title="Page settings">
                        <div style={{ display: 'grid', gap: 14 }}>
                            <ChoiceGroup
                                label="Page size"
                                value={pageSize}
                                onChange={setPageSize}
                                options={[
                                    { value: 'a4', title: 'A4' },
                                    { value: 'letter', title: 'US Letter' },
                                    { value: 'fit', title: 'Same as image' },
                                ]}
                            />
                            <ChoiceGroup
                                label="Margin"
                                value={margin}
                                onChange={setMargin}
                                options={[
                                    { value: 'none', title: 'No margin' },
                                    { value: 'small', title: 'Small margin' },
                                    { value: 'large', title: 'Large margin' },
                                ]}
                            />
                        </div>
                    </OptionsCard>

                    <PrimaryAction onClick={convertToPdf}>
                        Convert to PDF <ArrowRight size={22} />
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status={tool.progress || 'Converting images to PDF...'} />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="Your images are now a PDF!"
                />
            )}
        </div>
    );
}
