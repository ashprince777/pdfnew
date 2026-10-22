"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { rgb, degrees, type PDFDocument, type PDFImage } from '@cantoo/pdf-lib';
import { Stamp, ArrowRight, ImageUp } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, ChoiceGroup, PrimaryAction, toolStyles } from '@/components/ToolUI';
import { baseName, embedUnicodeFont, getVisualFrame, hexToRgbComponents, loadPdf, PdfToolError, savePdf, toDrawableText } from '@/lib/pdf';
import { useToolRunner } from '@/lib/useToolRunner';
import { UpgradePrompt, usePremiumFeature } from '@/components/PremiumGate';

type Kind = 'text' | 'image';
type Layout = 'diagonal' | 'horizontal';
type Placement = 'center' | 'tiled';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Embeds the watermark image (WebP and unusual encodings go through a canvas as PNG). */
async function embedWatermarkImage(doc: PDFDocument, file: File): Promise<PDFImage> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    try {
        if (bytes[0] === 0x89 && bytes[1] === 0x50) return await doc.embedPng(bytes);
        if (bytes[0] === 0xff && bytes[1] === 0xd8) return await doc.embedJpg(bytes);
    } catch {
        // fall back to re-encoding below
    }
    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch {
        throw new PdfToolError('The watermark image could not be read. Please use a PNG or JPG file.');
    }
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    canvas.width = canvas.height = 0;
    if (!blob) throw new PdfToolError('The watermark image could not be read.');
    return doc.embedPng(new Uint8Array(await blob.arrayBuffer()));
}

/** Lower-left corner that puts the centre of a w×h box, rotated by `angle` degrees, at (cx, cy). */
function rotatedOrigin(cx: number, cy: number, w: number, h: number, angle: number) {
    const rad = (angle * Math.PI) / 180;
    return {
        x: cx - (w * Math.cos(rad) - h * Math.sin(rad)) / 2,
        y: cy - (w * Math.sin(rad) + h * Math.cos(rad)) / 2,
    };
}

export default function WatermarkPdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const [kind, setKind] = useState<Kind>('text');
    const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageSize, setImageSize] = useState(40);
    const [placement, setPlacement] = useState<Placement>('center');
    const [layout, setLayout] = useState<Layout>('diagonal');
    const [opacity, setOpacity] = useState(30);
    const [color, setColor] = useState('#cc1a1a');
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const tool = useToolRunner();
    const imageAllowed = usePremiumFeature('image-watermark');

    // Preview URL for the chosen watermark image, released when it changes or on unmount.
    const imageUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
    useEffect(() => () => {
        if (imageUrl) URL.revokeObjectURL(imageUrl);
    }, [imageUrl]);

    const angle = layout === 'diagonal' ? 45 : 0;
    const canApply = kind === 'text' ? watermarkText.trim().length > 0 : imageAllowed && imageFile !== null;

    const applyWatermark = () => {
        if (!file) return;
        tool.run(async () => {
            const pdfDoc = await loadPdf(file);

            if (kind === 'image') {
                if (!imageFile) throw new PdfToolError('Please choose a watermark image.');
                // Embedded once and reused on every page, so the file only grows by one image.
                const image = await embedWatermarkImage(pdfDoc, imageFile);
                for (const page of pdfDoc.getPages()) {
                    const frame = getVisualFrame(page);
                    const w = (frame.width * imageSize) / 100;
                    const h = w * (image.height / image.width);
                    const centres: [number, number][] = [];
                    if (placement === 'center') {
                        centres.push([frame.width / 2, frame.height / 2]);
                    } else {
                        // Tile with a gap of roughly half the image size.
                        const stepX = w * 1.5;
                        const stepY = Math.max(h, w * 0.5) * 1.6;
                        for (let y = stepY / 2; y < frame.height + stepY / 2; y += stepY) {
                            const offset = (Math.round(y / stepY) % 2) * (stepX / 2);
                            for (let x = stepX / 2 - offset; x < frame.width + stepX / 2; x += stepX) centres.push([x, y]);
                        }
                    }
                    for (const [cx, cy] of centres) {
                        const origin = rotatedOrigin(cx, cy, w, h, angle);
                        page.drawImage(image, {
                            ...frame.toPdf(origin.x, origin.y),
                            width: w,
                            height: h,
                            opacity: opacity / 100,
                            rotate: degrees(frame.rotation + angle),
                        });
                    }
                }
            } else {
                const font = await embedUnicodeFont(pdfDoc, 'bold');
                const text = toDrawableText(font, watermarkText.trim());
                if (!text.trim()) throw new PdfToolError('Please enter the watermark text.');
                const [r, g, b] = hexToRgbComponents(color);
                for (const page of pdfDoc.getPages()) {
                    const frame = getVisualFrame(page);
                    // Size the text to span ~70% of the page along its direction.
                    const span = layout === 'diagonal' ? Math.hypot(frame.width, frame.height) : frame.width;
                    const fontSize = Math.min(160, (span * 0.7) / font.widthOfTextAtSize(text, 1));
                    const origin = rotatedOrigin(
                        frame.width / 2,
                        frame.height / 2,
                        font.widthOfTextAtSize(text, fontSize),
                        font.heightAtSize(fontSize, { descender: false }),
                        angle
                    );
                    page.drawText(text, {
                        ...frame.toPdf(origin.x, origin.y),
                        size: fontSize,
                        font,
                        color: rgb(r, g, b),
                        opacity: opacity / 100,
                        rotate: degrees(frame.rotation + angle),
                    });
                }
            }

            return { blob: await savePdf(pdfDoc), filename: `${baseName(file.name)}_watermarked.pdf` };
        }, 'Failed to apply watermark. Please try again.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
    };

    const previewTiles = placement === 'tiled' ? 9 : 1;

    return (
        <div className="container">
            <ToolHeader title="Add Watermark to PDF" subtitle="Stamp text or your own image (logo, stamp, signature) across every page of your PDF." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={(files) => setFile(files[0] ?? null)} accept=".pdf" />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace>
                    <SelectedFile file={file} onRemove={reset} icon={Stamp} />

                    <OptionsCard title="Watermark">
                        <div style={{ display: 'grid', gap: 16 }}>
                            <ChoiceGroup
                                label="Watermark type"
                                value={kind}
                                onChange={setKind}
                                options={[
                                    { value: 'text', title: 'Text', text: 'e.g. CONFIDENTIAL, DRAFT' },
                                    { value: 'image', title: imageAllowed ? 'Image' : 'Image (Premium)', text: 'Your logo, stamp or seal' },
                                ]}
                            />

                            {kind === 'text' ? (
                                <div className={toolStyles.field}>
                                    <label className={toolStyles.label} htmlFor="wm-text">Text</label>
                                    <input id="wm-text" type="text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} className={toolStyles.input} placeholder="e.g. DRAFT" maxLength={80} />
                                </div>
                            ) : (
                                <div className={toolStyles.field}>
                                    <span className={toolStyles.label}>Image</span>
                                    <input
                                        ref={imageInputRef}
                                        type="file"
                                        accept={IMAGE_TYPES.join(',')}
                                        aria-label="Watermark image"
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            const picked = e.target.files?.[0];
                                            e.target.value = '';
                                            if (!picked) return;
                                            if (!IMAGE_TYPES.includes(picked.type)) return tool.notify('Please choose a PNG, JPG or WebP image.');
                                            if (picked.size > 20 * 1024 * 1024) return tool.notify('The watermark image must be smaller than 20 MB.');
                                            setImageFile(picked);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => imageInputRef.current?.click()}
                                        className="btn btn-outline"
                                        style={{ gap: 8, justifyContent: 'flex-start', overflow: 'hidden' }}
                                    >
                                        <ImageUp size={18} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {imageFile ? imageFile.name : 'Choose image (PNG, JPG or WebP)'}
                                        </span>
                                    </button>
                                    <span className={toolStyles.hint}>Tip: a PNG with a transparent background looks best.</span>
                                </div>
                            )}

                            <ChoiceGroup
                                label="Layout"
                                value={layout}
                                onChange={setLayout}
                                options={[
                                    { value: 'diagonal', title: 'Diagonal' },
                                    { value: 'horizontal', title: 'Horizontal' },
                                ]}
                            />

                            {kind === 'image' && (
                                <ChoiceGroup
                                    label="Placement"
                                    value={placement}
                                    onChange={setPlacement}
                                    options={[
                                        { value: 'center', title: 'Center', text: 'One image in the middle' },
                                        { value: 'tiled', title: 'Tiled', text: 'Repeated across the page' },
                                    ]}
                                />
                            )}

                            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                <div className={toolStyles.field}>
                                    <label className={toolStyles.label} htmlFor="wm-opacity">Opacity: {opacity}%</label>
                                    <input id="wm-opacity" type="range" min={5} max={100} value={opacity} onChange={(e) => setOpacity(parseInt(e.target.value))} />
                                </div>
                                {kind === 'text' ? (
                                    <div className={toolStyles.field}>
                                        <label className={toolStyles.label} htmlFor="wm-color">Color</label>
                                        <input id="wm-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 56, height: 36, border: 'none', background: 'none', cursor: 'pointer' }} />
                                    </div>
                                ) : (
                                    <div className={toolStyles.field}>
                                        <label className={toolStyles.label} htmlFor="wm-size">Size: {imageSize}% of page width</label>
                                        <input id="wm-size" type="range" min={5} max={100} value={imageSize} onChange={(e) => setImageSize(parseInt(e.target.value))} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </OptionsCard>

                    <div
                        aria-hidden="true"
                        style={{
                            position: 'relative',
                            aspectRatio: '1 / 1.3',
                            maxWidth: 260,
                            width: '100%',
                            margin: '0 auto',
                            background: '#fff',
                            border: '1px solid var(--border-color)',
                            borderRadius: 8,
                            overflow: 'hidden',
                            display: 'grid',
                            gridTemplateColumns: previewTiles > 1 ? 'repeat(3, 1fr)' : '1fr',
                            placeItems: 'center',
                            boxShadow: 'var(--shadow-sm)',
                        }}
                    >
                        {kind === 'image' ? (
                            imageUrl ? (
                                Array.from({ length: previewTiles }, (_, i) => (
                                    // eslint-disable-next-line @next/next/no-img-element -- local blob: URL preview
                                    <img
                                        key={i}
                                        src={imageUrl}
                                        alt=""
                                        style={{
                                            width: `${placement === 'tiled' ? Math.min(90, imageSize * 3) : imageSize}%`,
                                            opacity: opacity / 100,
                                            transform: `rotate(${-angle}deg)`,
                                        }}
                                    />
                                ))
                            ) : (
                                <span style={{ fontSize: 12, color: '#94a3b8' }}>Choose an image</span>
                            )
                        ) : (
                            <span
                                style={{
                                    transform: `rotate(${-angle}deg)`,
                                    color,
                                    opacity: opacity / 100,
                                    fontWeight: 800,
                                    fontSize: Math.max(14, 220 / Math.max(watermarkText.length, 4)),
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {watermarkText || 'WATERMARK'}
                            </span>
                        )}
                        <span style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 11, color: '#94a3b8' }}>Preview</span>
                    </div>

                    {kind === 'image' && !imageAllowed && <UpgradePrompt feature="image-watermark" />}
                    <PrimaryAction onClick={applyWatermark} disabled={!canApply}>
                        Apply Watermark <ArrowRight size={20} />
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status="Applying watermark..." />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="Watermark applied to every page!"
                />
            )}
        </div>
    );
}
