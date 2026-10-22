"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PenTool, ArrowRight, RotateCcw, Check, ImageUp } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import PdfPagePreview, { type PageSize } from '@/components/PdfPagePreview';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, ChoiceGroup, PrimaryAction, toolStyles } from '@/components/ToolUI';
import { baseName, getVisualFrame, loadPdf, PdfToolError, savePdf } from '@/lib/pdf';
import { useToolRunner } from '@/lib/useToolRunner';

type PageMode = 'last' | 'first' | 'all' | 'custom';
type InkColor = 'blue' | 'black';

const INK: Record<InkColor, string> = { blue: '#0033cc', black: '#111111' };
const SIGNATURE_FONT = '"Segoe Script", "Brush Script MT", "Apple Chancery", cursive';

interface Signature {
    dataUrl: string;
    /** height / width */
    aspect: number;
}

/** Placement of the signature box, as fractions of the displayed page (origin top-left). */
interface Placement {
    x: number;
    y: number;
    width: number;
}

/** Crops transparent margins so the placed signature is exactly the ink. */
function trimCanvas(source: HTMLCanvasElement): Signature | null {
    const ctx = source.getContext('2d');
    if (!ctx) return null;
    const { width, height } = source;
    const data = ctx.getImageData(0, 0, width, height).data;
    let top = height, left = width, right = -1, bottom = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] > 8) {
                if (x < left) left = x;
                if (x > right) right = x;
                if (y < top) top = y;
                if (y > bottom) bottom = y;
            }
        }
    }
    if (right < 0) return null;
    const pad = 6;
    left = Math.max(0, left - pad);
    top = Math.max(0, top - pad);
    right = Math.min(width - 1, right + pad);
    bottom = Math.min(height - 1, bottom + pad);
    const out = document.createElement('canvas');
    out.width = right - left + 1;
    out.height = bottom - top + 1;
    out.getContext('2d')?.drawImage(source, left, top, out.width, out.height, 0, 0, out.width, out.height);
    return { dataUrl: out.toDataURL('image/png'), aspect: out.height / out.width };
}

const MAX_UPLOAD_SIDE = 1600;

/**
 * Turns an uploaded signature image into a trimmed PNG. When `removeBackground` is set,
 * white/light paper becomes transparent (with soft edges) so a photo or scan of a signature
 * doesn't cover the document with a white box.
 */
async function processUploadedSignature(file: File, removeBackground: boolean): Promise<Signature> {
    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
        throw new PdfToolError('This image could not be read. Please upload a PNG or JPG file.');
    }
    const scale = Math.min(1, MAX_UPLOAD_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas is not available');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    if (removeBackground) {
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = image.data;
        for (let i = 0; i < d.length; i += 4) {
            const luminance = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            // >= 225 is paper (transparent); 160-225 fades out to keep anti-aliased edges smooth.
            const keep = luminance >= 225 ? 0 : luminance <= 160 ? 1 : (225 - luminance) / 65;
            d[i + 3] = Math.round(d[i + 3] * keep);
        }
        ctx.putImageData(image, 0, 0);
    }

    const signature = trimCanvas(canvas);
    canvas.width = canvas.height = 0;
    if (!signature) {
        throw new PdfToolError(
            removeBackground
                ? 'No signature was found in this image. Try turning off "Remove white background".'
                : 'This image appears to be empty.'
        );
    }
    return signature;
}

function renderTypedSignature(name: string, color: string): Signature | null {
    if (!name.trim()) return null;
    const fontSize = 96;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.font = `${fontSize}px ${SIGNATURE_FONT}`;
    const width = Math.ceil(ctx.measureText(name).width) + 40;
    canvas.width = width;
    canvas.height = Math.ceil(fontSize * 1.6);
    ctx.font = `${fontSize}px ${SIGNATURE_FONT}`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 20, canvas.height / 2);
    return trimCanvas(canvas);
}

function SignaturePad({ color, onChange }: { color: string; onChange: (sig: Signature | null) => void }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const drawing = useRef(false);
    const [hasInk, setHasInk] = useState(false);

    // Size the backing store for the device pixel ratio so strokes stay crisp.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ratio = Math.min(window.devicePixelRatio || 1, 3);
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.round(rect.width * ratio);
        canvas.height = Math.round(rect.height * ratio);
        const ctx = canvas.getContext('2d');
        ctx?.scale(ratio, ratio);
    }, []);

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2.6;
        ctx.strokeStyle = color;
    }, [color]);

    const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const clear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx?.save();
        ctx?.setTransform(1, 0, 0, 1, 0, 0);
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        ctx?.restore();
        setHasInk(false);
        onChange(null);
    };

    return (
        <div>
            <div style={{ position: 'relative', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', background: '#fff' }}>
                <canvas
                    ref={canvasRef}
                    aria-label="Signature drawing area"
                    style={{ width: '100%', height: 170, display: 'block', cursor: 'crosshair', touchAction: 'none' }}
                    onPointerDown={(e) => {
                        const ctx = e.currentTarget.getContext('2d');
                        if (!ctx) return;
                        e.currentTarget.setPointerCapture(e.pointerId);
                        drawing.current = true;
                        const { x, y } = point(e);
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(x + 0.01, y);
                        ctx.stroke();
                        setHasInk(true);
                    }}
                    onPointerMove={(e) => {
                        if (!drawing.current) return;
                        const ctx = e.currentTarget.getContext('2d');
                        const { x, y } = point(e);
                        ctx?.lineTo(x, y);
                        ctx?.stroke();
                    }}
                    onPointerUp={(e) => {
                        if (!drawing.current) return;
                        drawing.current = false;
                        onChange(trimCanvas(e.currentTarget));
                    }}
                />
                {!hasInk && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: '#94a3b8', fontSize: 14 }}>
                        Sign here with your mouse, pen, or finger
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <button type="button" onClick={clear} className={toolStyles.iconButton}>
                    <RotateCcw size={14} /> Clear
                </button>
            </div>
        </div>
    );
}

export default function SignPdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const [totalPages, setTotalPages] = useState(1);
    const [pageMode, setPageMode] = useState<PageMode>('last');
    const [customPage, setCustomPage] = useState(1);
    const [signMode, setSignMode] = useState<'draw' | 'type' | 'upload'>('draw');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [removeBackground, setRemoveBackground] = useState(true);
    const [uploaded, setUploaded] = useState<{ file: File; removeBackground: boolean; signature: Signature } | null>(null);
    const uploadInputRef = useRef<HTMLInputElement | null>(null);
    const [typedName, setTypedName] = useState('');
    const [ink, setInk] = useState<InkColor>('blue');
    const [drawn, setDrawn] = useState<Signature | null>(null);
    const [pageSize, setPageSize] = useState<PageSize>({ width: 612, height: 792 });
    const [placement, setPlacement] = useState<Placement>({ x: 0.6, y: 0.82, width: 0.28 });
    const dragOffset = useRef<{ dx: number; dy: number } | null>(null);
    const tool = useToolRunner();

    const typed = useMemo(() => (signMode === 'type' ? renderTypedSignature(typedName, INK[ink]) : null), [signMode, typedName, ink]);
    const uploadedSignature =
        uploaded && uploaded.file === uploadFile && uploaded.removeBackground === removeBackground ? uploaded.signature : null;
    const signature = signMode === 'draw' ? drawn : signMode === 'type' ? typed : uploadedSignature;
    const { notify } = tool;

    // Process the uploaded image whenever it or the background option changes.
    useEffect(() => {
        if (!uploadFile) return;
        let cancelled = false;
        processUploadedSignature(uploadFile, removeBackground)
            .then((sig) => {
                if (!cancelled) setUploaded({ file: uploadFile, removeBackground, signature: sig });
            })
            .catch((err) => {
                if (cancelled) return;
                setUploadFile(null);
                notify(err instanceof PdfToolError ? err.message : 'This image could not be used as a signature.');
            });
        return () => {
            cancelled = true;
        };
    }, [uploadFile, removeBackground, notify]);

    const previewPage = pageMode === 'first' || pageMode === 'all' ? 1 : pageMode === 'last' ? totalPages : customPage;
    const boxHeight = signature ? placement.width * signature.aspect * (pageSize.width / pageSize.height) : 0.06;

    const clampPlacement = useCallback(
        (p: Placement): Placement => ({
            width: p.width,
            x: Math.min(Math.max(0, p.x), 1 - p.width),
            y: Math.min(Math.max(0, p.y), Math.max(0, 1 - boxHeight)),
        }),
        [boxHeight]
    );

    const handleFilesSelected = (files: File[]) => {
        const selected = files[0];
        if (!selected) return;
        loadPdf(selected)
            .then((doc) => {
                setFile(selected);
                setTotalPages(doc.getPageCount());
                setCustomPage(doc.getPageCount());
            })
            .catch((err) => tool.notify(err instanceof PdfToolError ? err.message : 'Could not open this PDF.'));
    };

    const presets: { value: string; title: string; x: number; y: number }[] = [
        { value: 'bl', title: 'Bottom left', x: 0.08, y: 0.86 },
        { value: 'bc', title: 'Bottom center', x: 0.5 - placement.width / 2, y: 0.86 },
        { value: 'br', title: 'Bottom right', x: 0.92 - placement.width, y: 0.86 },
    ];

    const signPdf = () => {
        if (!file) return;
        if (!signature) {
            return tool.notify(
                signMode === 'draw'
                    ? 'Please draw your signature first.'
                    : signMode === 'type'
                      ? 'Please enter your name to sign.'
                      : 'Please upload an image of your signature.'
            );
        }
        tool.run(async () => {
            const pdfDoc = await loadPdf(file);
            const sigImage = await pdfDoc.embedPng(signature.dataUrl);
            const count = pdfDoc.getPageCount();
            const targets =
                pageMode === 'first' ? [0] : pageMode === 'last' ? [count - 1] : pageMode === 'all' ? [...Array(count).keys()] : [Math.min(Math.max(customPage, 1), count) - 1];

            for (const index of targets) {
                const page = pdfDoc.getPage(index);
                const frame = getVisualFrame(page);
                const width = placement.width * frame.width;
                const height = width * signature.aspect;
                const x = placement.x * frame.width;
                const y = frame.height - placement.y * frame.height - height;
                page.drawImage(sigImage, { ...frame.toPdf(x, y), width, height, rotate: frame.rotate });
            }
            return { blob: await savePdf(pdfDoc), filename: `${baseName(file.name)}_signed.pdf` };
        }, 'Failed to sign PDF. Please try again.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
        setDrawn(null);
        setTypedName('');
        setUploadFile(null);
        setUploaded(null);
    };

    return (
        <div className="container">
            <ToolHeader title="Sign PDF Document" subtitle="Draw, type or upload your signature, then drag it into place on your PDF." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={handleFilesSelected} accept=".pdf" />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace wide>
                    <SelectedFile file={file} onRemove={reset} icon={PenTool} detail={`${totalPages} ${totalPages === 1 ? 'page' : 'pages'}`} />

                    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', alignItems: 'start' }}>
                        <div style={{ display: 'grid', gap: 20 }}>
                            <OptionsCard title="1. Create your signature">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                                    <ChoiceGroup
                                        label="Signature type"
                                        value={signMode}
                                        onChange={(mode) => {
                                            setSignMode(mode);
                                            // The drawing pad unmounts when switching, so its ink is gone too.
                                            setDrawn(null);
                                        }}
                                        options={[
                                            { value: 'draw', title: 'Draw' },
                                            { value: 'type', title: 'Type' },
                                            { value: 'upload', title: 'Upload' },
                                        ]}
                                    />
                                    {signMode !== 'upload' && (
                                    <div style={{ display: 'flex', gap: 8 }} role="radiogroup" aria-label="Ink color">
                                        {(Object.keys(INK) as InkColor[]).map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                role="radio"
                                                aria-checked={ink === c}
                                                aria-label={`${c} ink`}
                                                onClick={() => setInk(c)}
                                                style={{
                                                    width: 30,
                                                    height: 30,
                                                    borderRadius: '50%',
                                                    background: INK[c],
                                                    color: '#fff',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    outline: ink === c ? `2px solid ${INK[c]}` : 'none',
                                                    outlineOffset: 2,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                {ink === c && <Check size={14} />}
                                            </button>
                                        ))}
                                    </div>
                                    )}
                                </div>

                                {signMode === 'upload' ? (
                                    <div style={{ display: 'grid', gap: 12 }}>
                                        <input
                                            ref={uploadInputRef}
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            aria-label="Signature image"
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                const picked = e.target.files?.[0];
                                                e.target.value = '';
                                                if (!picked) return;
                                                if (!['image/png', 'image/jpeg', 'image/webp'].includes(picked.type)) {
                                                    return tool.notify('Please upload a PNG, JPG or WebP image.');
                                                }
                                                if (picked.size > 10 * 1024 * 1024) return tool.notify('The signature image must be smaller than 10 MB.');
                                                setUploadFile(picked);
                                            }}
                                        />
                                        {uploadFile && uploadedSignature ? (
                                            <div
                                                style={{
                                                    padding: 12,
                                                    borderRadius: 8,
                                                    border: '1px solid var(--border-color)',
                                                    // Checkerboard shows which parts are transparent.
                                                    background: 'repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 16px 16px',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element -- generated data: URL */}
                                                <img src={uploadedSignature.dataUrl} alt="Uploaded signature" style={{ maxHeight: 140, maxWidth: '100%' }} />
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => uploadInputRef.current?.click()}
                                                style={{
                                                    minHeight: 150,
                                                    border: '2px dashed var(--border-color)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    background: 'var(--section-alt)',
                                                    color: 'var(--text-light)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 8,
                                                    fontSize: 14,
                                                }}
                                            >
                                                <ImageUp size={28} aria-hidden="true" />
                                                {uploadFile ? 'Processing image...' : 'Upload signature image (PNG or JPG)'}
                                            </button>
                                        )}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={removeBackground}
                                                    onChange={(e) => setRemoveBackground(e.target.checked)}
                                                    style={{ width: 18, height: 18 }}
                                                />
                                                Remove white background
                                            </label>
                                            {uploadFile && (
                                                <button type="button" className={toolStyles.iconButton} onClick={() => uploadInputRef.current?.click()}>
                                                    <ImageUp size={14} /> Change image
                                                </button>
                                            )}
                                        </div>
                                        <p className={toolStyles.hint}>
                                            Tip: sign on white paper, take a photo and upload it. The paper is removed automatically.
                                        </p>
                                    </div>
                                ) : signMode === 'draw' ? (
                                    <SignaturePad color={INK[ink]} onChange={setDrawn} />
                                ) : (
                                    <div style={{ display: 'grid', gap: 12 }}>
                                        <input
                                            type="text"
                                            value={typedName}
                                            onChange={(e) => setTypedName(e.target.value)}
                                            placeholder="Type your full name..."
                                            aria-label="Your name"
                                            className={toolStyles.input}
                                        />
                                        {typedName && (
                                            <div style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid var(--border-color)', textAlign: 'center', fontFamily: SIGNATURE_FONT, fontSize: 36, color: INK[ink] }}>
                                                {typedName}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </OptionsCard>

                            <OptionsCard title="2. Choose pages">
                                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                                    <div className={toolStyles.field}>
                                        <label className={toolStyles.label} htmlFor="sign-pages">Apply on</label>
                                        <select id="sign-pages" value={pageMode} onChange={(e) => setPageMode(e.target.value as PageMode)} className={toolStyles.input}>
                                            <option value="last">Last page</option>
                                            <option value="first">First page</option>
                                            <option value="all">All pages</option>
                                            <option value="custom">Specific page</option>
                                        </select>
                                    </div>
                                    {pageMode === 'custom' && (
                                        <div className={toolStyles.field}>
                                            <label className={toolStyles.label} htmlFor="sign-page-num">Page number</label>
                                            <input
                                                id="sign-page-num"
                                                type="number"
                                                min={1}
                                                max={totalPages}
                                                value={customPage}
                                                onChange={(e) => setCustomPage(Math.min(totalPages, Math.max(1, parseInt(e.target.value) || 1)))}
                                                className={toolStyles.input}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className={toolStyles.field} style={{ marginTop: 14 }}>
                                    <label className={toolStyles.label} htmlFor="sign-size">Signature size</label>
                                    <input
                                        id="sign-size"
                                        type="range"
                                        min={10}
                                        max={60}
                                        value={Math.round(placement.width * 100)}
                                        onChange={(e) => setPlacement((p) => clampPlacement({ ...p, width: parseInt(e.target.value) / 100 }))}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                                    {presets.map((preset) => (
                                        <button key={preset.value} type="button" className="btn btn-outline" style={{ padding: '8px 12px', fontSize: 14 }} onClick={() => setPlacement((p) => clampPlacement({ ...p, x: preset.x, y: preset.y }))}>
                                            {preset.title}
                                        </button>
                                    ))}
                                </div>
                            </OptionsCard>
                        </div>

                        <OptionsCard title={`3. Drag to position (page ${previewPage})`}>
                            <PdfPagePreview
                                file={file}
                                pageNumber={previewPage}
                                maxWidth={520}
                                onPageSize={setPageSize}
                                overlayProps={{
                                    onPointerMove: (e) => {
                                        if (!dragOffset.current) return;
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const fx = (e.clientX - rect.left) / rect.width - dragOffset.current.dx;
                                        const fy = (e.clientY - rect.top) / rect.height - dragOffset.current.dy;
                                        setPlacement((p) => clampPlacement({ ...p, x: fx, y: fy }));
                                    },
                                    onPointerUp: () => {
                                        dragOffset.current = null;
                                    },
                                }}
                            >
                                <div
                                    role="img"
                                    aria-label="Signature position. Drag to move."
                                    onPointerDown={(e) => {
                                        const overlay = e.currentTarget.parentElement!.getBoundingClientRect();
                                        dragOffset.current = {
                                            dx: (e.clientX - overlay.left) / overlay.width - placement.x,
                                            dy: (e.clientY - overlay.top) / overlay.height - placement.y,
                                        };
                                        e.currentTarget.parentElement!.setPointerCapture(e.pointerId);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        left: `${placement.x * 100}%`,
                                        top: `${placement.y * 100}%`,
                                        width: `${placement.width * 100}%`,
                                        height: `${boxHeight * 100}%`,
                                        border: '2px dashed var(--primary)',
                                        background: signature ? 'rgba(109, 40, 217, 0.06)' : 'rgba(109, 40, 217, 0.12)',
                                        cursor: 'move',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 12,
                                        color: 'var(--primary)',
                                    }}
                                >
                                    {signature ? (
                                        // eslint-disable-next-line @next/next/no-img-element -- generated data: URL
                                        <img src={signature.dataUrl} alt="" draggable={false} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />
                                    ) : (
                                        'Signature'
                                    )}
                                </div>
                            </PdfPagePreview>
                        </OptionsCard>
                    </div>

                    <div style={{ maxWidth: 480, width: '100%', margin: '0 auto' }}>
                        <PrimaryAction onClick={signPdf} disabled={!signature}>
                            Sign & Download PDF <ArrowRight size={22} />
                        </PrimaryAction>
                    </div>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status="Embedding signature into PDF..." />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="Document signed successfully!"
                />
            )}
        </div>
    );
}
