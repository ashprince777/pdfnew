"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { rgb, BlendMode, type PDFDocument } from '@cantoo/pdf-lib';
import { Type, Highlighter, ArrowRight, Trash2, Eraser, ChevronLeft, ChevronRight, ImageUp, ScanText, Undo2, Bold, Minus, Plus, Move, RotateCcw } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import PdfPagePreview, { type PageSize } from '@/components/PdfPagePreview';
import { ToolHeader, SelectedFile, Notice, toolStyles } from '@/components/ToolUI';
import { baseName, embedUnicodeFont, getVisualFrame, hexToRgbComponents, loadPdf, PdfToolError, savePdf, toDrawableText } from '@/lib/pdf';
import { openPdfjsDocument } from '@/lib/pdfjs';
import { analyzePage, ocrPage, rgbToHex, sampleColors, type PageAnalysis, type TextSegment } from '@/lib/pageAnalysis';
import { drawnAspect, findPageImages, replacePageImage } from '@/lib/pageContent';
import { removeTextInBoxes, type UserBox } from '@/lib/textRemoval';
import { useToolRunner } from '@/lib/useToolRunner';
import { PremiumBadge, UpgradePrompt, usePremiumFeature } from '@/components/PremiumGate';
import styles from './EditPdf.module.css';

type Tool = 'text' | 'image' | 'whiteout' | 'highlight';

/** All coordinates are fractions (0-1) of the displayed page, origin top-left. */
interface TextStyle {
    size: number;
    bold: boolean;
    color: string;
}
type Annotation =
    | ({ id: number; kind: 'text'; page: number; x: number; y: number; text: string } & TextStyle)
    | { id: number; kind: 'highlight' | 'whiteout'; page: number; x: number; y: number; w: number; h: number }
    | ({
          id: number;
          kind: 'replace';
          page: number;
          /** Box of the original text */
          x: number;
          y: number;
          w: number;
          h: number;
          baseline: number;
          text: string;
          background: string;
          original: { text: string } & TextStyle;
      } & TextStyle)
    | { id: number; kind: 'image'; page: number; name: string; aspect: number; file: File; url: string };

/** An image drawn on the page, in page fractions. */
interface ImageBox {
    name: string;
    aspect: number;
    x: number;
    y: number;
    w: number;
    h: number;
}

// Noto Sans vertical metrics (units per em = 1000). With CSS line-height: 1 the baseline sits
// at (ascender + (1 - (ascender + descender)) / 2) em below the top of the line box.
const NOTO_ASCENDER = 1.069;
const NOTO_DESCENDER = 0.293;
const BASELINE_OFFSET_EM = NOTO_ASCENDER + (1 - (NOTO_ASCENDER + NOTO_DESCENDER)) / 2;
/** Replacement text may run this much wider than the original before it is scaled down to fit. */
const MAX_TEXT_GROWTH = 1.25;
const ANALYSIS_CACHE_SIZE = 3;

const TOOLS: { value: Tool; label: string; icon: typeof Type; hint: string }[] = [
    { value: 'text', label: 'Text', icon: Type, hint: 'Click any text to edit it, or click an empty spot to add new text.' },
    { value: 'image', label: 'Images', icon: ImageUp, hint: 'Click an image to replace it with a picture from your device.' },
    { value: 'whiteout', label: 'Whiteout', icon: Eraser, hint: 'Drag a box over content to white it out. Text underneath is deleted from the file.' },
    { value: 'highlight', label: 'Highlight', icon: Highlighter, hint: 'Drag across the page to highlight an area.' },
];

let nextId = 0;

const isReplaceChanged = (a: Extract<Annotation, { kind: 'replace' }>) =>
    a.text !== a.original.text || a.size !== a.original.size || a.bold !== a.original.bold || a.color !== a.original.color;

const isMeaningful = (a: Annotation) => (a.kind === 'replace' ? isReplaceChanged(a) : a.kind === 'text' ? a.text.trim().length > 0 : true);

/** Fits an uploaded picture into a transparent canvas with the original image's proportions. */
async function fitImage(file: File, aspect: number): Promise<Uint8Array> {
    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
        throw new PdfToolError(`"${file.name}" could not be read as an image.`);
    }
    const longSide = Math.min(2000, Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(aspect >= 1 ? longSide : longSide * aspect));
    canvas.height = Math.max(1, Math.round(aspect >= 1 ? longSide / aspect : longSide));
    const scale = Math.min(canvas.width / bitmap.width, canvas.height / bitmap.height);
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    canvas.getContext('2d')?.drawImage(bitmap, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    canvas.width = canvas.height = 0;
    if (!blob) throw new PdfToolError('Could not prepare the replacement image.');
    return new Uint8Array(await blob.arrayBuffer());
}

function findImageBoxes(doc: PDFDocument, pageIndex: number): ImageBox[] {
    const frame = getVisualFrame(doc.getPage(pageIndex));
    return findPageImages(doc, pageIndex).map((image) => {
        const [a, b, c, d, e, f] = image.matrix;
        const corners = [
            [e, f],
            [a + e, b + f],
            [c + e, d + f],
            [a + c + e, b + d + f],
        ].map(([x, y]) => frame.toVisual(x, y));
        const xs = corners.map((p) => p.x);
        const ys = corners.map((p) => p.y);
        const left = Math.max(0, Math.min(...xs));
        const right = Math.min(frame.width, Math.max(...xs));
        const bottom = Math.max(0, Math.min(...ys));
        const top = Math.min(frame.height, Math.max(...ys));
        return { name: image.name, aspect: drawnAspect(image), x: left / frame.width, y: 1 - top / frame.height, w: (right - left) / frame.width, h: (top - bottom) / frame.height };
    });
}

/** An input that grows with its content (hidden sizer + input stacked in one grid cell). */
function AutoWidthInput(props: React.InputHTMLAttributes<HTMLInputElement> & { value: string; inputRef?: React.Ref<HTMLInputElement> }) {
    const { inputRef, style, ...rest } = props;
    return (
        <span className={styles.autoWidth} style={style}>
            <span className={styles.sizer} aria-hidden="true">
                {props.value || ' '}
            </span>
            <input ref={inputRef} {...rest} className={styles.inlineInput} />
        </span>
    );
}

export default function EditPdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<PageSize>({ width: 612, height: 792 });
    const [displayWidth, setDisplayWidth] = useState(0);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [currentTool, setCurrentTool] = useState<Tool>('text');
    const [newTextStyle, setNewTextStyle] = useState<TextStyle>({ size: 14, bold: false, color: '#000000' });
    const [segmentsByPage, setSegmentsByPage] = useState<Record<number, TextSegment[]>>({});
    const [imagesByPage, setImagesByPage] = useState<Record<number, ImageBox[]>>({});
    const [analyzing, setAnalyzing] = useState(false);
    const [ocrProgress, setOcrProgress] = useState<number | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const inlineInputRef = useRef<HTMLInputElement | null>(null);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const imageTarget = useRef<ImageBox | null>(null);
    const pdfjsDocRef = useRef<PDFDocumentProxy | null>(null);
    const libDocRef = useRef<PDFDocument | null>(null);
    const analyses = useRef(new Map<number, PageAnalysis>());
    const gesture = useRef<{ type: 'move'; id: number; dx: number; dy: number } | { type: 'draw'; id: number; x0: number; y0: number } | null>(null);
    const tool = useToolRunner();
    const { notify } = tool;
    const canOcr = usePremiumFeature('ocr');
    const canReplaceImages = usePremiumFeature('replace-image');

    // Track the rendered page width so font sizes in the preview match the PDF.
    useEffect(() => {
        const el = overlayRef.current;
        if (!el) return;
        const observer = new ResizeObserver(([entry]) => setDisplayWidth(entry.contentRect.width));
        observer.observe(el);
        return () => observer.disconnect();
    }, [file, tool.status]);

    // Release documents and rendered pages when the file changes or on unmount.
    const releaseFile = useCallback(() => {
        pdfjsDocRef.current?.destroy();
        pdfjsDocRef.current = null;
        libDocRef.current = null;
        analyses.current.forEach((a) => (a.canvas.width = a.canvas.height = 0));
        analyses.current.clear();
    }, []);
    useEffect(() => releaseFile, [releaseFile]);

    const getAnalysis = useCallback(async (pageNumber: number): Promise<PageAnalysis | null> => {
        const cached = analyses.current.get(pageNumber);
        if (cached) return cached;
        const doc = pdfjsDocRef.current;
        if (!doc) return null;
        const analysis = await analyzePage(doc, pageNumber);
        analyses.current.set(pageNumber, analysis);
        // Rendered pages are large; keep only the most recent few.
        if (analyses.current.size > ANALYSIS_CACHE_SIZE) {
            const [oldest, evicted] = analyses.current.entries().next().value as [number, PageAnalysis];
            evicted.canvas.width = evicted.canvas.height = 0;
            analyses.current.delete(oldest);
        }
        return analysis;
    }, []);

    // Detect the text and images of the current page.
    useEffect(() => {
        if (!file) return;
        let cancelled = false;
        (async () => {
            try {
                if (currentTool === 'image' && !(currentPage in imagesByPage) && libDocRef.current) {
                    const boxes = findImageBoxes(libDocRef.current, currentPage - 1);
                    if (!cancelled) setImagesByPage((prev) => ({ ...prev, [currentPage]: boxes }));
                }
                if (currentTool === 'text' && !(currentPage in segmentsByPage)) {
                    setAnalyzing(true);
                    const analysis = await getAnalysis(currentPage);
                    if (!cancelled && analysis) setSegmentsByPage((prev) => ({ ...prev, [currentPage]: analysis.segments }));
                }
            } catch (error) {
                console.error('Page analysis failed', error);
                if (!cancelled) notify('Could not read the contents of this page.');
            } finally {
                if (!cancelled) setAnalyzing(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [file, currentTool, currentPage, segmentsByPage, imagesByPage, getAnalysis, notify]);

    const pxPerPt = displayWidth > 0 ? displayWidth / pageSize.width : 1;
    const displayHeight = displayWidth * (pageSize.height / pageSize.width);
    const selected = annotations.find((a) => a.id === selectedId) ?? null;

    const handleFilesSelected = (files: File[]) => {
        const selectedFile = files[0];
        if (!selectedFile) return;
        (async () => {
            const libDoc = await loadPdf(selectedFile);
            const pdfjsDoc = await openPdfjsDocument(await selectedFile.arrayBuffer());
            releaseFile();
            libDocRef.current = libDoc;
            pdfjsDocRef.current = pdfjsDoc;
            setFile(selectedFile);
            setTotalPages(libDoc.getPageCount());
            setCurrentPage(1);
            setAnnotations([]);
            setSegmentsByPage({});
            setImagesByPage({});
        })().catch((err) => notify(err instanceof PdfToolError ? err.message : 'Could not open this PDF.'));
    };

    const fraction = (e: React.PointerEvent) => {
        const rect = overlayRef.current!.getBoundingClientRect();
        return {
            x: Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1),
            y: Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1),
        };
    };

    const update = (id: number, patch: Partial<Annotation>) =>
        setAnnotations((prev) => prev.map((a) => (a.id === id ? ({ ...a, ...patch } as Annotation) : a)));

    /** Deselects, dropping empty new-text boxes. */
    const deselect = () => {
        setAnnotations((prev) => prev.filter((a) => !(a.id === selectedId && a.kind === 'text' && !a.text.trim())));
        setSelectedId(null);
    };

    const focusInline = () => setTimeout(() => inlineInputRef.current?.focus(), 0);

    const onOverlayPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (selectedId !== null) {
            // First click outside an edit just closes it (like Sejda).
            deselect();
            return;
        }
        if (currentTool === 'image') return;
        const { x, y } = fraction(e);
        const id = ++nextId;
        if (currentTool === 'text') {
            // New text: the click point is the baseline-left of the first line, roughly.
            const yTop = Math.max(0, y - (newTextStyle.size * BASELINE_OFFSET_EM) / pageSize.height);
            setAnnotations((prev) => [...prev, { id, kind: 'text', page: currentPage, x, y: yTop, text: '', ...newTextStyle }]);
            setSelectedId(id);
            focusInline();
            return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        gesture.current = { type: 'draw', id, x0: x, y0: y };
        setAnnotations((prev) => [...prev, { id, kind: currentTool, page: currentPage, x, y, w: 0, h: 0 }]);
    };

    const onOverlayPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const g = gesture.current;
        if (!g) return;
        const { x, y } = fraction(e);
        if (g.type === 'draw') update(g.id, { x: Math.min(g.x0, x), y: Math.min(g.y0, y), w: Math.abs(x - g.x0), h: Math.abs(y - g.y0) });
        else update(g.id, { x: Math.max(0, x - g.dx), y: Math.max(0, y - g.dy) });
    };

    const onOverlayPointerUp = () => {
        const g = gesture.current;
        gesture.current = null;
        if (g?.type === 'draw') {
            // Drop accidental clicks that did not draw a visible box.
            setAnnotations((prev) => prev.filter((a) => a.id !== g.id || ((a.kind === 'highlight' || a.kind === 'whiteout') && a.w > 0.005 && a.h > 0.003)));
        }
    };

    const startMove = (e: React.PointerEvent, ann: Annotation) => {
        e.stopPropagation();
        if (ann.kind === 'replace' || ann.kind === 'image') return; // anchored to the original content
        setSelectedId(ann.id);
        const { x, y } = fraction(e);
        overlayRef.current?.setPointerCapture(e.pointerId);
        gesture.current = { type: 'move', id: ann.id, dx: x - ann.x, dy: y - ann.y };
    };

    const editSegment = async (e: React.PointerEvent, segment: TextSegment) => {
        e.stopPropagation();
        if (selectedId !== null) deselect();
        const W = pageSize.width;
        const H = pageSize.height;
        const box = { x: segment.x / W, y: segment.top / H, w: segment.width / W, h: segment.height / H };
        const existing = annotations.find((a) => a.kind === 'replace' && a.page === currentPage && Math.abs(a.x - box.x) < 1e-6 && Math.abs(a.y - box.y) < 1e-6);
        if (existing) {
            setSelectedId(existing.id);
        } else {
            const analysis = await getAnalysis(currentPage);
            const colors = analysis ? sampleColors(analysis, { x: segment.x, top: segment.top, width: segment.width, height: segment.height }) : null;
            const style: TextStyle = { size: Math.round(segment.size * 10) / 10, bold: segment.bold, color: colors ? rgbToHex(colors.text) : '#000000' };
            const id = ++nextId;
            setAnnotations((prev) => [
                ...prev,
                {
                    id,
                    kind: 'replace',
                    page: currentPage,
                    ...box,
                    baseline: segment.baseline / H,
                    text: segment.text,
                    background: colors ? rgbToHex(colors.background) : '#ffffff',
                    original: { text: segment.text, ...style },
                    ...style,
                },
            ]);
            setSelectedId(id);
        }
        focusInline();
    };

    const runOcr = async () => {
        setOcrProgress(0);
        try {
            const analysis = await getAnalysis(currentPage);
            if (!analysis) return;
            const segments = await ocrPage(analysis, setOcrProgress);
            setSegmentsByPage((prev) => ({ ...prev, [currentPage]: segments }));
            if (segments.length === 0) notify('No text was recognised on this page.');
        } catch (error) {
            console.error('OCR failed', error);
            notify('Text recognition failed. Please try again.');
        } finally {
            setOcrProgress(null);
        }
    };

    const chooseImage = (e: React.PointerEvent, box: ImageBox) => {
        e.stopPropagation();
        imageTarget.current = box;
        imageInputRef.current?.click();
    };

    const onImagePicked = (picked: File | undefined) => {
        const box = imageTarget.current;
        if (!picked || !box) return;
        if (!/^image\/(png|jpeg|webp|gif|bmp)$/.test(picked.type)) return notify('Please choose a PNG, JPG or WebP image.');
        const url = URL.createObjectURL(picked);
        const existing = annotations.find((a) => a.kind === 'image' && a.page === currentPage && a.name === box.name);
        if (existing?.kind === 'image') {
            URL.revokeObjectURL(existing.url);
            update(existing.id, { file: picked, url });
        } else {
            setAnnotations((prev) => [...prev, { id: ++nextId, kind: 'image', page: currentPage, name: box.name, aspect: box.aspect, file: picked, url }]);
        }
    };

    const removeAnnotation = (id: number) => {
        setAnnotations((prev) => {
            const removed = prev.find((a) => a.id === id);
            if (removed?.kind === 'image') URL.revokeObjectURL(removed.url);
            return prev.filter((a) => a.id !== id);
        });
        setSelectedId(null);
    };

    const undo = () => {
        const last = [...annotations].reverse().find(isMeaningful);
        if (last) removeAnnotation(last.id);
    };

    /** Applies a style change to the selected text (or to new text defaults). */
    const setStyle = (patch: Partial<TextStyle>) => {
        if (selected && (selected.kind === 'text' || selected.kind === 'replace')) update(selected.id, patch);
        setNewTextStyle((prev) => ({ ...prev, ...patch }));
    };

    const saveEditedPdf = () => {
        if (!file) return;
        const changes = annotations.filter(isMeaningful);
        if (changes.length === 0) return notify('Make at least one change first.');
        tool.run(async () => {
            const pdfDoc = await loadPdf(file);
            const bold = await embedUnicodeFont(pdfDoc, 'bold');
            const regular = await embedUnicodeFont(pdfDoc, 'regular');

            // First really delete the original text under replaced text and whiteout boxes, so it
            // can't be copied, searched or recovered from the file. This must run before anything
            // is drawn on the page.
            const boxesByPage = new Map<number, UserBox[]>();
            for (const ann of changes) {
                if ((ann.kind !== 'replace' && ann.kind !== 'whiteout') || ann.page > pdfDoc.getPageCount()) continue;
                const frame = getVisualFrame(pdfDoc.getPage(ann.page - 1));
                const pad = ann.kind === 'replace' ? 1 : 0;
                const a = frame.toPdf(ann.x * frame.width - pad, frame.height - (ann.y + ann.h) * frame.height - pad);
                const b = frame.toPdf((ann.x + ann.w) * frame.width + pad, frame.height - ann.y * frame.height + pad);
                const list = boxesByPage.get(ann.page - 1) ?? [];
                list.push({ x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) });
                boxesByPage.set(ann.page - 1, list);
            }
            for (const [pageIndex, boxes] of boxesByPage) {
                try {
                    await removeTextInBoxes(pdfDoc, pageIndex, boxes);
                } catch (error) {
                    // Unusual content streams: fall back to covering the text (previous behaviour).
                    console.warn('Could not remove original text from page', pageIndex + 1, error);
                }
            }

            for (const ann of changes) {
                if (ann.page > pdfDoc.getPageCount()) continue;
                const pageIndex = ann.page - 1;
                const page = pdfDoc.getPage(pageIndex);
                const frame = getVisualFrame(page);
                const W = frame.width;
                const H = frame.height;

                if (ann.kind === 'image') {
                    const png = await pdfDoc.embedPng(await fitImage(ann.file, ann.aspect));
                    replacePageImage(pdfDoc, pageIndex, ann.name, png.ref);
                } else if (ann.kind === 'replace') {
                    // Cover the original text with the sampled background colour...
                    const [br, bg, bb] = hexToRgbComponents(ann.background);
                    const pad = 1;
                    page.drawRectangle({
                        ...frame.toPdf(ann.x * W - pad, H - (ann.y + ann.h) * H - pad),
                        width: ann.w * W + 2 * pad,
                        height: ann.h * H + 2 * pad,
                        color: rgb(br, bg, bb),
                        rotate: frame.rotate,
                    });
                    // ...then write the new text on the same baseline.
                    const font = ann.bold ? bold : regular;
                    const text = toDrawableText(font, ann.text);
                    if (!text.trim()) continue;
                    const maxWidth = ann.w * W * MAX_TEXT_GROWTH;
                    const width = font.widthOfTextAtSize(text, ann.size);
                    const size = width > maxWidth && ann.size === ann.original.size ? (ann.size * maxWidth) / width : ann.size;
                    const [r, g, b] = hexToRgbComponents(ann.color);
                    page.drawText(text, { ...frame.toPdf(ann.x * W, H - ann.baseline * H), size, font, color: rgb(r, g, b), rotate: frame.rotate });
                } else if (ann.kind === 'text') {
                    const font = ann.bold ? bold : regular;
                    const text = toDrawableText(font, ann.text);
                    if (!text.trim()) continue;
                    const baselineY = H - ann.y * H - ann.size * BASELINE_OFFSET_EM;
                    const [r, g, b] = hexToRgbComponents(ann.color);
                    page.drawText(text, { ...frame.toPdf(ann.x * W, baselineY), size: ann.size, font, color: rgb(r, g, b), rotate: frame.rotate });
                } else {
                    const isHighlight = ann.kind === 'highlight';
                    page.drawRectangle({
                        ...frame.toPdf(ann.x * W, H - (ann.y + ann.h) * H),
                        width: ann.w * W,
                        height: ann.h * H,
                        color: isHighlight ? rgb(1, 0.9, 0) : rgb(1, 1, 1),
                        opacity: isHighlight ? 0.5 : 1,
                        blendMode: isHighlight ? BlendMode.Multiply : undefined,
                        rotate: frame.rotate,
                    });
                }
            }
            return { blob: await savePdf(pdfDoc), filename: `${baseName(file.name)}_edited.pdf` };
        }, 'Failed to save edited PDF.');
    };

    const reset = () => {
        tool.reset();
        annotations.forEach((a) => a.kind === 'image' && URL.revokeObjectURL(a.url));
        releaseFile();
        setFile(null);
        setAnnotations([]);
        setSelectedId(null);
        setSegmentsByPage({});
        setImagesByPage({});
    };

    const pageAnnotations = annotations.filter((a) => a.page === currentPage);
    const pageSegments = segmentsByPage[currentPage];
    const pageImages = imagesByPage[currentPage] ?? (libDocRef.current && pageAnnotations.some((a) => a.kind === 'image') ? findImageBoxes(libDocRef.current, currentPage - 1) : []);
    const changeCount = annotations.filter(isMeaningful).length;
    const isReplaced = (segment: TextSegment) =>
        pageAnnotations.some((a) => a.kind === 'replace' && Math.abs(a.x - segment.x / pageSize.width) < 1e-6 && Math.abs(a.y - segment.top / pageSize.height) < 1e-6);
    const toolHint = TOOLS.find((t) => t.value === currentTool)?.hint;

    /** Floating formatting toolbar shown above the selected text. */
    const renderTextToolbar = (ann: Extract<Annotation, { kind: 'text' | 'replace' }>, topPx: number) => (
        <div
            className={styles.floatingToolbar}
            style={{ left: `${ann.x * 100}%`, top: Math.max(-48, topPx - 46) }}
            onPointerDown={(e) => e.stopPropagation()}
            role="toolbar"
            aria-label="Text formatting"
        >
            <button type="button" className={ann.bold ? styles.active : ''} onClick={() => setStyle({ bold: !ann.bold })} aria-pressed={ann.bold} title="Bold">
                <Bold size={16} />
            </button>
            <button type="button" onClick={() => setStyle({ size: Math.max(4, Math.round((ann.size - 1) * 10) / 10) })} title="Smaller text" aria-label="Smaller text">
                <Minus size={16} />
            </button>
            <span className={styles.sizeLabel}>{Math.round(ann.size * 10) / 10}</span>
            <button type="button" onClick={() => setStyle({ size: Math.min(96, Math.round((ann.size + 1) * 10) / 10) })} title="Larger text" aria-label="Larger text">
                <Plus size={16} />
            </button>
            <label className={styles.colorButton} title="Text colour">
                <span style={{ background: ann.color }} />
                <input type="color" value={ann.color} onChange={(e) => setStyle({ color: e.target.value })} aria-label="Text colour" />
            </label>
            {ann.kind === 'text' && (
                <button type="button" title="Drag to move" aria-label="Move text" onPointerDown={(e) => startMove(e, ann)} style={{ cursor: 'move' }}>
                    <Move size={16} />
                </button>
            )}
            <button
                type="button"
                onClick={() => removeAnnotation(ann.id)}
                title={ann.kind === 'replace' ? 'Restore original text' : 'Delete'}
                aria-label={ann.kind === 'replace' ? 'Restore original text' : 'Delete text'}
            >
                {ann.kind === 'replace' ? <RotateCcw size={16} /> : <Trash2 size={16} />}
            </button>
        </div>
    );

    const inlineKeys = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            e.preventDefault();
            deselect();
        }
    };

    return (
        <div className="container">
            {/* Same faces as the embedded PDF fonts, so the preview matches the output. */}
            <style>{`@font-face { font-family: 'NotoSansEdit'; src: url('/fonts/NotoSans-Bold.ttf') format('truetype'); font-weight: 700; font-display: swap; }
@font-face { font-family: 'NotoSansEdit'; src: url('/fonts/NotoSans-Regular.ttf') format('truetype'); font-weight: 400; font-display: swap; }`}</style>
            <ToolHeader title="Edit PDF Document" subtitle="Click on text to change it, replace images, add text, whiteout or highlight." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={handleFilesSelected} accept=".pdf" />}

            {tool.status === 'IDLE' && file && (
                <div className={styles.editor}>
                    <SelectedFile file={file} onRemove={reset} detail={`${changeCount} ${changeCount === 1 ? 'change' : 'changes'}`} />

                    <div className={styles.toolbar} role="toolbar" aria-label="Editing tools">
                        {TOOLS.map(({ value, label, icon: Icon }) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={currentTool === value}
                                onClick={() => {
                                    deselect();
                                    setCurrentTool(value);
                                }}
                                className={currentTool === value ? styles.toolActive : styles.toolButton}
                            >
                                <Icon size={18} /> {label}
                                {value === 'image' && !canReplaceImages && <PremiumBadge />}
                            </button>
                        ))}
                        <button type="button" className={styles.toolButton} onClick={undo} disabled={changeCount === 0}>
                            <Undo2 size={18} /> Undo
                        </button>
                    </div>

                    <div className={styles.pageBar}>
                        <button type="button" className={toolStyles.iconButton} disabled={currentPage <= 1} onClick={() => { deselect(); setCurrentPage((p) => p - 1); }} aria-label="Previous page">
                            <ChevronLeft size={18} />
                        </button>
                        <span className={styles.pageLabel}>
                            Page {currentPage} / {totalPages}
                        </span>
                        <button type="button" className={toolStyles.iconButton} disabled={currentPage >= totalPages} onClick={() => { deselect(); setCurrentPage((p) => p + 1); }} aria-label="Next page">
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <p className={styles.hint}>
                        {toolHint}
                        {currentTool === 'text' && analyzing && ' Reading the text on this page...'}
                    </p>

                    {currentTool === 'text' && pageSegments && (
                        <div className={styles.ocrRow}>
                            {pageSegments.length === 0 && ocrProgress === null && (
                                <Notice tone="warning">This page has no selectable text. It is probably a scan. Detect the text with OCR to edit it.</Notice>
                            )}
                            {ocrProgress !== null ? (
                                <span className={styles.hint} role="status">
                                    Recognising text... {Math.round(ocrProgress * 100)}%
                                </span>
                            ) : canOcr ? (
                                <button type="button" className={styles.toolButton} onClick={runOcr}>
                                    <ScanText size={18} /> {pageSegments.length === 0 ? 'Detect text with OCR' : 'Text missing? Detect with OCR'}
                                </button>
                            ) : (
                                pageSegments.length === 0 && <UpgradePrompt feature="ocr" />
                            )}
                        </div>
                    )}
                    {currentTool === 'image' && !canReplaceImages && <UpgradePrompt feature="replace-image" />}
                    {currentTool === 'image' && canReplaceImages && imagesByPage[currentPage]?.length === 0 && <Notice>No images were found on this page.</Notice>}

                    <div className={styles.pageArea}>
                        <PdfPagePreview
                            file={file}
                            pageNumber={currentPage}
                            maxWidth={900}
                            onPageCount={setTotalPages}
                            onPageSize={setPageSize}
                            overlayProps={{
                                ref: overlayRef,
                                onPointerDown: onOverlayPointerDown,
                                onPointerMove: onOverlayPointerMove,
                                onPointerUp: onOverlayPointerUp,
                                style: { cursor: currentTool === 'text' ? 'text' : currentTool === 'image' ? 'default' : 'crosshair' },
                            } as React.HTMLAttributes<HTMLDivElement> & { ref: React.Ref<HTMLDivElement> }}
                        >
                            {currentTool === 'text' &&
                                pageSegments?.filter((s) => !isReplaced(s)).map((segment, i) => (
                                    <div
                                        key={`seg-${i}`}
                                        role="button"
                                        aria-label={`Edit text: ${segment.text}`}
                                        onPointerDown={(e) => editSegment(e, segment)}
                                        className={styles.segment}
                                        style={{
                                            left: `${(segment.x / pageSize.width) * 100}%`,
                                            top: `${(segment.top / pageSize.height) * 100}%`,
                                            width: `${(segment.width / pageSize.width) * 100}%`,
                                            height: `${(segment.height / pageSize.height) * 100}%`,
                                        }}
                                    />
                                ))}

                            {currentTool === 'image' &&
                                canReplaceImages &&
                                (imagesByPage[currentPage] ?? []).map((box, i) => (
                                    <div
                                        key={`img-${i}`}
                                        role="button"
                                        aria-label="Replace this image"
                                        onPointerDown={(e) => chooseImage(e, box)}
                                        className={styles.imageTarget}
                                        style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}
                                    >
                                        <span>
                                            <ImageUp size={14} /> Replace image
                                        </span>
                                    </div>
                                ))}

                            {pageAnnotations.map((ann) => {
                                const isSelected = ann.id === selectedId;
                                if (ann.kind === 'image') {
                                    return pageImages
                                        .filter((box) => box.name === ann.name)
                                        .map((box, i) => (
                                            <div
                                                key={`${ann.id}-${i}`}
                                                onPointerDown={(e) => (currentTool === 'image' ? chooseImage(e, box) : e.stopPropagation())}
                                                className={styles.replacedImage}
                                                style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element -- local blob: URL */}
                                                <img src={ann.url} alt="Replacement" draggable={false} />
                                                {currentTool === 'image' && (
                                                    <button
                                                        type="button"
                                                        className={styles.cornerButton}
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        onClick={() => removeAnnotation(ann.id)}
                                                        title="Restore original image"
                                                        aria-label="Restore original image"
                                                    >
                                                        <RotateCcw size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ));
                                }
                                if (ann.kind === 'replace') {
                                    const fontPx = ann.size * pxPerPt;
                                    const textTopPx = ann.baseline * displayHeight - fontPx * BASELINE_OFFSET_EM;
                                    const changed = isReplaceChanged(ann);
                                    return (
                                        <React.Fragment key={ann.id}>
                                            {(changed || isSelected) && (
                                                // Covers the original text, like the saved output.
                                                <div
                                                    className={styles.cover}
                                                    style={{ left: `${ann.x * 100}%`, top: `${ann.y * 100}%`, width: `${ann.w * 100}%`, height: `${ann.h * 100}%`, background: ann.background }}
                                                    onPointerDown={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedId(ann.id);
                                                        focusInline();
                                                    }}
                                                />
                                            )}
                                            {isSelected ? (
                                                <>
                                                    {renderTextToolbar(ann, textTopPx)}
                                                    <AutoWidthInput
                                                        inputRef={inlineInputRef}
                                                        value={ann.text}
                                                        onChange={(e) => update(ann.id, { text: e.target.value })}
                                                        onKeyDown={inlineKeys}
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        aria-label="Edit text"
                                                        style={{
                                                            left: `${ann.x * 100}%`,
                                                            top: textTopPx,
                                                            fontSize: fontPx,
                                                            fontWeight: ann.bold ? 700 : 400,
                                                            color: ann.color,
                                                            background: ann.background,
                                                        }}
                                                    />
                                                </>
                                            ) : (
                                                changed && (
                                                    <span
                                                        className={styles.placedText}
                                                        onPointerDown={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedId(ann.id);
                                                            focusInline();
                                                        }}
                                                        style={{ left: `${ann.x * 100}%`, top: textTopPx, fontSize: fontPx, fontWeight: ann.bold ? 700 : 400, color: ann.color }}
                                                    >
                                                        {ann.text}
                                                    </span>
                                                )
                                            )}
                                        </React.Fragment>
                                    );
                                }
                                if (ann.kind === 'text') {
                                    const fontPx = ann.size * pxPerPt;
                                    const topPx = ann.y * displayHeight;
                                    return isSelected ? (
                                        <React.Fragment key={ann.id}>
                                            {renderTextToolbar(ann, topPx)}
                                            <AutoWidthInput
                                                inputRef={inlineInputRef}
                                                value={ann.text}
                                                placeholder="Type here"
                                                onChange={(e) => update(ann.id, { text: e.target.value })}
                                                onKeyDown={inlineKeys}
                                                onPointerDown={(e) => e.stopPropagation()}
                                                aria-label="New text"
                                                style={{ left: `${ann.x * 100}%`, top: topPx, fontSize: fontPx, fontWeight: ann.bold ? 700 : 400, color: ann.color, outline: '1px dashed var(--accent)' }}
                                            />
                                        </React.Fragment>
                                    ) : (
                                        <span
                                            key={ann.id}
                                            className={styles.placedText}
                                            onPointerDown={(e) => {
                                                e.stopPropagation();
                                                setSelectedId(ann.id);
                                                focusInline();
                                            }}
                                            style={{ left: `${ann.x * 100}%`, top: topPx, fontSize: fontPx, fontWeight: ann.bold ? 700 : 400, color: ann.color }}
                                        >
                                            {ann.text}
                                        </span>
                                    );
                                }
                                return (
                                    <div
                                        key={ann.id}
                                        onPointerDown={(e) => startMove(e, ann)}
                                        className={styles.box}
                                        style={{
                                            left: `${ann.x * 100}%`,
                                            top: `${ann.y * 100}%`,
                                            width: `${ann.w * 100}%`,
                                            height: `${ann.h * 100}%`,
                                            background: ann.kind === 'highlight' ? 'rgba(255, 230, 0, 0.5)' : '#fff',
                                            mixBlendMode: ann.kind === 'highlight' ? 'multiply' : undefined,
                                            outline: isSelected ? '2px solid var(--accent)' : undefined,
                                        }}
                                    >
                                        {isSelected && (
                                            <button
                                                type="button"
                                                className={styles.cornerButton}
                                                onPointerDown={(e) => e.stopPropagation()}
                                                onClick={() => removeAnnotation(ann.id)}
                                                aria-label="Delete"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </PdfPagePreview>
                    </div>

                    <p className={styles.footnote}>
                        Edited text uses Noto Sans in the original size and colour. Replaced text, whited-out text and replaced images are fully removed from the file.
                    </p>

                    <div className={styles.applyBar}>
                        <span className={styles.applyCount} aria-live="polite">
                            {changeCount === 0 ? 'No changes yet' : `${changeCount} ${changeCount === 1 ? 'change' : 'changes'} ready`}
                        </span>
                        <button type="button" className="btn btn-primary btn-lg" onClick={saveEditedPdf} disabled={changeCount === 0} style={{ gap: 10 }}>
                            Apply changes <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {tool.status === 'PROCESSING' && <Processing status="Saving your changes..." />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="Your edited PDF is ready!"
                />
            )}

            <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Replacement image"
                style={{ display: 'none' }}
                onChange={(e) => {
                    onImagePicked(e.target.files?.[0]);
                    e.target.value = '';
                }}
            />
        </div>
    );
}
