"use client";
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, ImagePlus, RotateCw, ScanLine, Trash2, X } from 'lucide-react';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, OptionsCard, ChoiceGroup, PrimaryAction, Notice, toolStyles } from '@/components/ToolUI';
import { pdfBytesToBlob } from '@/lib/pdf';
import { buildScanPdf, FILTER_PREVIEW, type ScanFilter, type ScannedPage, type ScanPageSize } from '@/lib/scan';
import { useToolRunner } from '@/lib/useToolRunner';

const MAX_PAGES = 60;
const SMALL_BUTTON = { minWidth: 36, minHeight: 36, padding: 0 };

interface PageItem extends ScannedPage {
    url: string;
}

export default function ScanToPdfClient() {
    const [pages, setPages] = useState<PageItem[]>([]);
    const [filter, setFilter] = useState<ScanFilter>('document');
    const [size, setSize] = useState<ScanPageSize>('a4');
    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [flash, setFlash] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const photoInput = useRef<HTMLInputElement>(null);
    const uploadInput = useRef<HTMLInputElement>(null);
    const nextId = useRef(0);
    const pagesRef = useRef(pages);
    const tool = useToolRunner();

    useEffect(() => {
        pagesRef.current = pages;
    });

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setCameraOpen(false);
    };

    useEffect(
        () => () => {
            streamRef.current?.getTracks().forEach((track) => track.stop());
            pagesRef.current.forEach((page) => URL.revokeObjectURL(page.url));
        },
        []
    );

    const addBlobs = (blobs: Blob[]) => {
        const room = MAX_PAGES - pagesRef.current.length;
        if (room <= 0 || blobs.length > room) tool.notify(`You can add up to ${MAX_PAGES} pages per document.`);
        const added = blobs.slice(0, Math.max(0, room)).map((blob) => ({ id: `p${++nextId.current}`, blob, rotation: 0 as const, url: URL.createObjectURL(blob) }));
        if (added.length) setPages((prev) => [...prev, ...added]);
    };

    const openCamera = async () => {
        setCameraError('');
        if (!navigator.mediaDevices?.getUserMedia) {
            setCameraError('This browser cannot open the camera here. Use "Take photo" or "Add images" instead.');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } },
                audio: false,
            });
            streamRef.current = stream;
            setCameraOpen(true);
        } catch (error) {
            const name = (error as { name?: string })?.name;
            setCameraError(
                name === 'NotAllowedError'
                    ? 'Camera permission was denied. Allow camera access in your browser settings, or use "Take photo" instead.'
                    : 'No camera was found. Use "Take photo" or "Add images" instead.'
            );
        }
    };

    useEffect(() => {
        const video = videoRef.current;
        if (cameraOpen && video && streamRef.current) {
            video.srcObject = streamRef.current;
            video.play().catch(() => {});
        }
    }, [cameraOpen]);

    const capture = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')!.drawImage(video, 0, 0);
        canvas.toBlob((blob) => blob && addBlobs([blob]), 'image/jpeg', 0.92);
        setFlash(true);
        setTimeout(() => setFlash(false), 150);
    };

    const onFiles = (list: FileList | null) => {
        const images = Array.from(list ?? []).filter((file) => file.type.startsWith('image/'));
        if (list && images.length < list.length) tool.notify('Only image files can be added.');
        addBlobs(images);
    };

    const update = (id: string, change: (page: PageItem) => PageItem | null) =>
        setPages((prev) =>
            prev.flatMap((page) => {
                if (page.id !== id) return [page];
                const next = change(page);
                if (!next) URL.revokeObjectURL(page.url);
                return next ? [next] : [];
            })
        );

    const move = (index: number, delta: number) =>
        setPages((prev) => {
            const target = index + delta;
            if (target < 0 || target >= prev.length) return prev;
            const next = [...prev];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });

    const createPdf = () => {
        if (pages.length === 0) return;
        stopCamera();
        tool.run(async () => {
            const bytes = await buildScanPdf(pages, filter, size, tool.setProgress);
            const stamp = new Date().toISOString().slice(0, 10);
            return { blob: pdfBytesToBlob(bytes), filename: `scan_${stamp}.pdf` };
        }, 'Could not create the PDF. Please try again.');
    };

    const reset = () => {
        tool.reset();
        pages.forEach((page) => URL.revokeObjectURL(page.url));
        setPages([]);
    };

    return (
        <div className="container">
            <ToolHeader title="Scan to PDF" subtitle="Use your phone or laptop camera to scan paper documents into a clean PDF. Nothing leaves your device." />

            {tool.status === 'IDLE' && (
                <ToolWorkspace wide>
                    {cameraOpen ? (
                        <OptionsCard title={`Camera: page ${pages.length + 1}`}>
                            <div style={{ position: 'relative', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
                                <video ref={videoRef} playsInline muted data-testid="scan-video" style={{ display: 'block', width: '100%', maxHeight: '65vh', objectFit: 'contain' }} />
                                {flash && <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: 0.7 }} />}
                            </div>
                            <p className={toolStyles.hint} style={{ marginTop: 8 }}>Hold the page flat, fill the frame and avoid shadows. Capture each page, then press Done.</p>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                                <button type="button" className="btn btn-primary" onClick={capture}>
                                    <Camera size={18} aria-hidden="true" /> Capture page
                                </button>
                                <button type="button" className="btn btn-outline" onClick={stopCamera}>
                                    Done
                                </button>
                            </div>
                        </OptionsCard>
                    ) : (
                        <OptionsCard title={pages.length ? 'Add more pages' : 'Start scanning'}>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                                <button type="button" className="btn btn-primary" onClick={openCamera}>
                                    <Camera size={18} aria-hidden="true" /> Open camera
                                </button>
                                <button type="button" className="btn btn-outline" onClick={() => photoInput.current?.click()}>
                                    <ScanLine size={18} aria-hidden="true" /> Take photo
                                </button>
                                <button type="button" className="btn btn-outline" onClick={() => uploadInput.current?.click()}>
                                    <ImagePlus size={18} aria-hidden="true" /> Add images
                                </button>
                            </div>
                            {cameraError && (
                                <p role="alert" className={toolStyles.hint} style={{ color: 'var(--error)', marginTop: 10, textAlign: 'center' }}>
                                    {cameraError}
                                </p>
                            )}
                        </OptionsCard>
                    )}
                    <input ref={photoInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (onFiles(e.target.files), (e.target.value = ''))} />
                    <input ref={uploadInput} type="file" accept="image/*" multiple hidden data-testid="scan-upload" onChange={(e) => (onFiles(e.target.files), (e.target.value = ''))} />

                    {pages.length > 0 && (
                        <>
                            <OptionsCard title={`${pages.length} page${pages.length === 1 ? '' : 's'}`}>
                                <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
                                    {pages.map((page, index) => (
                                        <figure key={page.id} data-testid="scan-page" style={{ margin: 0, border: '1px solid var(--border-color)', borderRadius: 8, padding: 8, background: 'var(--bg-secondary, transparent)' }}>
                                            <div style={{ aspectRatio: '3 / 4', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fff', borderRadius: 4 }}>
                                                {/* eslint-disable-next-line @next/next/no-img-element -- local blob: URL */}
                                                <img
                                                    src={page.url}
                                                    alt={`Page ${index + 1}`}
                                                    style={{ maxWidth: '100%', maxHeight: '100%', transform: `rotate(${page.rotation}deg)`, filter: FILTER_PREVIEW[filter] }}
                                                />
                                            </div>
                                            <figcaption style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, fontSize: 13 }}>
                                                <span>{index + 1}</span>
                                                <span style={{ display: 'flex', gap: 2 }}>
                                                    <button type="button" className={toolStyles.iconButton} style={SMALL_BUTTON} aria-label={`Move page ${index + 1} left`} disabled={index === 0} onClick={() => move(index, -1)}>
                                                        <ArrowLeft size={15} />
                                                    </button>
                                                    <button type="button" className={toolStyles.iconButton} style={SMALL_BUTTON} aria-label={`Move page ${index + 1} right`} disabled={index === pages.length - 1} onClick={() => move(index, 1)}>
                                                        <ArrowRight size={15} />
                                                    </button>
                                                    <button type="button" className={toolStyles.iconButton} style={SMALL_BUTTON} aria-label={`Rotate page ${index + 1}`} onClick={() => update(page.id, (p) => ({ ...p, rotation: ((p.rotation + 90) % 360) as PageItem['rotation'] }))}>
                                                        <RotateCw size={15} />
                                                    </button>
                                                    <button type="button" className={toolStyles.iconButton} style={SMALL_BUTTON} aria-label={`Delete page ${index + 1}`} onClick={() => update(page.id, () => null)}>
                                                        <Trash2 size={15} />
                                                    </button>
                                                </span>
                                            </figcaption>
                                        </figure>
                                    ))}
                                </div>
                                <button type="button" className="btn btn-outline" style={{ marginTop: 12, padding: '8px 12px', fontSize: 14 }} onClick={reset}>
                                    <X size={15} aria-hidden="true" /> Start over
                                </button>
                            </OptionsCard>

                            <OptionsCard title="Options">
                                <p className={toolStyles.label}>Look</p>
                                <ChoiceGroup
                                    label="Look"
                                    value={filter}
                                    onChange={setFilter}
                                    options={[
                                        { value: 'document', title: 'Document', text: 'Crisp black & white' },
                                        { value: 'gray', title: 'Grayscale' },
                                        { value: 'color', title: 'Original colour' },
                                    ]}
                                />
                                <div style={{ marginTop: 16 }}>
                                    <p className={toolStyles.label}>Page size</p>
                                    <ChoiceGroup
                                        label="Page size"
                                        value={size}
                                        onChange={setSize}
                                        options={[
                                            { value: 'a4', title: 'A4' },
                                            { value: 'fit', title: 'Fit to photo' },
                                        ]}
                                    />
                                </div>
                            </OptionsCard>

                            <div style={{ maxWidth: 480, width: '100%', margin: '0 auto' }}>
                                <PrimaryAction onClick={createPdf}>
                                    Create PDF <ArrowRight size={22} />
                                </PrimaryAction>
                            </div>
                        </>
                    )}

                    {pages.length === 0 && !cameraOpen && (
                        <Notice>On a phone, &quot;Open camera&quot; uses the back camera. Photos are processed on your device and are never uploaded.</Notice>
                    )}
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status={tool.progress || 'Creating PDF...'} />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="Scan saved as PDF!"
                />
            )}
        </div>
    );
}
