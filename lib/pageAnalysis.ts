import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { Worker as OcrWorker } from 'tesseract.js';
import { getPdfjs, renderPageToCanvas } from './pdfjs';

/** Broad style of the original font, used to pick the closest standard font for edited text. */
export type FontFamily = 'sans' | 'serif' | 'mono';

/** An editable run of text, in displayed page points (origin top-left). */
export interface TextSegment {
    text: string;
    x: number;
    top: number;
    width: number;
    height: number;
    /** Baseline, measured from the top of the page. */
    baseline: number;
    /** Font size in points. */
    size: number;
    bold: boolean;
    family: FontFamily;
    italic: boolean;
}

export interface PageAnalysis {
    width: number;
    height: number;
    segments: TextSegment[];
    /** Page rendered at `scale` px per point; used for OCR and colour sampling. */
    canvas: HTMLCanvasElement;
    scale: number;
}

export type Rgb = [number, number, number];

/** Pixel density used for analysis: ~216 DPI is a good balance for OCR accuracy and speed. */
const ANALYSIS_SCALE = 3;

interface Item {
    str: string;
    x: number;
    baseline: number;
    width: number;
    size: number;
    bold: boolean;
    family: FontFamily;
    italic: boolean;
}

/** What pdf.js knows about a loaded font (only the fields used here). */
interface LoadedFont {
    name?: string;
    isMonospace?: boolean;
    isSerifFont?: boolean;
    italic?: boolean;
}

/** Classifies a font as sans, serif or monospace from pdf.js flags and its PostScript name. */
function classifyFont(font: LoadedFont | undefined): { family: FontFamily; italic: boolean } {
    const name = font?.name ?? '';
    const italic = Boolean(font?.italic) || /italic|oblique/i.test(name);
    if (font?.isMonospace || /courier|mono|consol|menlo|typewriter|lucidaconsole/i.test(name)) return { family: 'mono', italic };
    if (/sans|arial|helvet|calibri|verdana|tahoma|segoe|roboto|gothic|univers|futura/i.test(name)) return { family: 'sans', italic };
    if (font?.isSerifFont || /times|serif|roman|georgia|garamond|cambria|book|palatino|minion/i.test(name)) return { family: 'serif', italic };
    return { family: 'sans', italic };
}

function toSegment(items: Item[]): TextSegment {
    const size = Math.max(...items.map((i) => i.size));
    const baseline = items.reduce((sum, i) => sum + i.baseline, 0) / items.length;
    const x = items[0].x;
    const right = Math.max(...items.map((i) => i.x + i.width));
    let text = '';
    let lastRight: number | null = null;
    for (const item of items) {
        if (lastRight !== null && item.x - lastRight > item.size * 0.15 && !text.endsWith(' ') && !item.str.startsWith(' ')) text += ' ';
        text += item.str;
        lastRight = item.x + item.width;
    }
    const top = baseline - size * 0.92;
    return { text: text.replace(/\s+/g, ' ').trim(), x, top, width: right - x, height: size * 1.2, baseline, size, bold: items.some((i) => i.bold), family: items[0].family, italic: items[0].italic };
}

/** Groups items into lines, then splits lines into segments at column-sized gaps (table cells stay separate). */
function buildSegments(items: Item[]): TextSegment[] {
    const sorted = [...items].sort((a, b) => a.baseline - b.baseline || a.x - b.x);
    const lines: Item[][] = [];
    for (const item of sorted) {
        const line = lines[lines.length - 1];
        if (line && Math.abs(line[0].baseline - item.baseline) <= Math.max(1.5, item.size * 0.35)) line.push(item);
        else lines.push([item]);
    }
    const segments: TextSegment[] = [];
    for (const line of lines) {
        line.sort((a, b) => a.x - b.x);
        let current: Item[] = [];
        for (const item of line) {
            const last = current[current.length - 1];
            if (last && item.x - (last.x + last.width) > Math.max(6, item.size * 1.1)) {
                segments.push(toSegment(current));
                current = [];
            }
            current.push(item);
        }
        if (current.length) segments.push(toSegment(current));
    }
    return segments.filter((s) => s.text.length > 0);
}

/** Renders a page and reads its text layer as editable segments. */
export async function analyzePage(doc: PDFDocumentProxy, pageNumber: number): Promise<PageAnalysis> {
    const { Util } = await getPdfjs();
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    // Rendering first also loads the fonts, which tells us which runs are bold.
    const canvas = await renderPageToCanvas(page, ANALYSIS_SCALE);
    const content = await page.getTextContent();

    const items: Item[] = [];
    for (const raw of content.items) {
        const item = raw as TextItem;
        if (!('str' in item) || !item.str.trim()) continue;
        const m = Util.transform(viewport.transform, item.transform);
        // Only horizontal, left-to-right text can be edited in place.
        if (m[0] <= 0 || Math.abs(m[1]) > Math.abs(m[0]) * 0.05) continue;
        let font: LoadedFont | undefined;
        try {
            if (page.commonObjs.has(item.fontName)) font = page.commonObjs.get(item.fontName) as LoadedFont;
        } catch {
            // font not loaded; treat as regular sans
        }
        const fontName = font?.name ?? '';
        items.push({
            str: item.str,
            x: m[4],
            baseline: m[5],
            width: item.width,
            size: Math.hypot(m[2], m[3]) || item.height || 10,
            bold: /bold|black|heavy|semibold|demi/i.test(fontName),
            ...classifyFont(font),
        });
    }

    return { width: viewport.width, height: viewport.height, segments: buildSegments(items), canvas, scale: ANALYSIS_SCALE };
}

let ocrWorker: Promise<OcrWorker> | null = null;
let ocrProgress: ((value: number) => void) | null = null;

function getOcrWorker(): Promise<OcrWorker> {
    if (!ocrWorker) {
        ocrWorker = import('tesseract.js').then(({ createWorker }) =>
            // All OCR assets are served from our own origin (see scripts/copy-pdf-worker.mjs).
            createWorker('eng', 1, {
                workerPath: '/tesseract/worker.min.js',
                corePath: '/tesseract',
                langPath: '/tesseract/lang',
                gzip: true,
                logger: (m: { status: string; progress: number }) => {
                    if (m.status === 'recognizing text') ocrProgress?.(m.progress);
                },
            })
        );
        ocrWorker.catch(() => {
            ocrWorker = null;
        });
    }
    return ocrWorker;
}

/** Recognises the text of a rendered page (for scans), returning editable segments. */
export async function ocrPage(analysis: PageAnalysis, onProgress?: (value: number) => void): Promise<TextSegment[]> {
    const worker = await getOcrWorker();
    ocrProgress = onProgress ?? null;
    try {
        const { data } = await worker.recognize(analysis.canvas, {}, { blocks: true });
        const s = analysis.scale;
        const segments: TextSegment[] = [];
        for (const block of data.blocks ?? []) {
            for (const paragraph of block.paragraphs) {
                for (const line of paragraph.lines) {
                    const words = line.words.filter((w) => w.text.trim() && w.confidence > 20);
                    if (!words.length) continue;
                    const lineHeight = line.bbox.y1 - line.bbox.y0;
                    // Split a line where words are far apart (separate columns).
                    let group: typeof words = [];
                    const flush = () => {
                        if (!group.length) return;
                        const x0 = Math.min(...group.map((w) => w.bbox.x0));
                        const x1 = Math.max(...group.map((w) => w.bbox.x1));
                        const y0 = Math.min(...group.map((w) => w.bbox.y0));
                        const midX = (x0 + x1) / 2;
                        const { baseline } = line;
                        const slope = baseline.x1 !== baseline.x0 ? (baseline.y1 - baseline.y0) / (baseline.x1 - baseline.x0) : 0;
                        const baseY = baseline.y0 + slope * (midX - baseline.x0);
                        const size = Math.max(4, (baseY - y0) / 0.72 / s);
                        segments.push({
                            text: group.map((w) => w.text).join(' '),
                            x: x0 / s,
                            top: baseY / s - size * 0.92,
                            width: (x1 - x0) / s,
                            height: size * 1.2,
                            baseline: baseY / s,
                            size,
                            bold: false,
                            family: 'sans',
                            italic: false,
                        });
                        group = [];
                    };
                    for (const word of words) {
                        const last = group[group.length - 1];
                        if (last && word.bbox.x0 - last.bbox.x1 > lineHeight * 1.5) flush();
                        group.push(word);
                    }
                    flush();
                }
            }
        }
        return segments;
    } finally {
        ocrProgress = null;
    }
}

/**
 * Samples the background (around the box) and text colour (darkest/most contrasting pixels
 * inside the box) from the rendered page, so a replacement blends into coloured rows too.
 */
export function sampleColors(analysis: PageAnalysis, box: { x: number; top: number; width: number; height: number }): { background: Rgb; text: Rgb } {
    const { canvas, scale } = analysis;
    const ctx = canvas.getContext('2d');
    const fallback = { background: [255, 255, 255] as Rgb, text: [0, 0, 0] as Rgb };
    if (!ctx) return fallback;
    const pad = 2;
    const x0 = Math.max(0, Math.floor(box.x * scale) - pad);
    const y0 = Math.max(0, Math.floor(box.top * scale) - pad);
    const x1 = Math.min(canvas.width, Math.ceil((box.x + box.width) * scale) + pad);
    const y1 = Math.min(canvas.height, Math.ceil((box.top + box.height) * scale) + pad);
    if (x1 - x0 < 3 || y1 - y0 < 3) return fallback;
    const data = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    const w = x1 - x0;
    const h = y1 - y0;
    const pixel = (x: number, y: number): Rgb => {
        const i = (y * w + x) * 4;
        return [data[i], data[i + 1], data[i + 2]];
    };

    const border: Rgb[] = [];
    for (let x = 0; x < w; x++) border.push(pixel(x, 0), pixel(x, h - 1));
    for (let y = 0; y < h; y++) border.push(pixel(0, y), pixel(w - 1, y));
    const median = (values: number[]) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
    const background: Rgb = [0, 1, 2].map((c) => median(border.map((p) => p[c]))) as Rgb;

    const inside: { p: Rgb; d: number }[] = [];
    for (let y = pad; y < h - pad; y++) {
        for (let x = pad; x < w - pad; x++) {
            const p = pixel(x, y);
            inside.push({ p, d: Math.abs(p[0] - background[0]) + Math.abs(p[1] - background[1]) + Math.abs(p[2] - background[2]) });
        }
    }
    inside.sort((a, b) => b.d - a.d);
    const ink = inside.slice(0, Math.max(1, Math.floor(inside.length * 0.08))).filter((v) => v.d > 60);
    if (!ink.length) return { background, text: fallback.text };
    const text: Rgb = [0, 1, 2].map((c) => Math.round(ink.reduce((sum, v) => sum + v.p[c], 0) / ink.length)) as Rgb;
    return { background, text };
}

export const rgbToHex = (rgb: Rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
