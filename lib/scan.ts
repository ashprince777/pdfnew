import { PDFDocument } from '@cantoo/pdf-lib';
import { canvasToBlob, releaseCanvas } from './pdfjs';

export type ScanFilter = 'color' | 'gray' | 'document';
export type ScanPageSize = 'a4' | 'fit';

export interface ScannedPage {
    id: string;
    blob: Blob;
    /** Extra clockwise rotation in degrees. */
    rotation: 0 | 90 | 180 | 270;
}

const A4: [number, number] = [595.28, 841.89];
const MAX_SIDE = 2200;
/** Resolution assumed for "Fit to image" pages. */
const FIT_DPI = 150;

/** CSS approximation of each filter, used for the on-screen thumbnails. */
export const FILTER_PREVIEW: Record<ScanFilter, string> = {
    color: 'none',
    gray: 'grayscale(1)',
    document: 'grayscale(1) contrast(1.8) brightness(1.15)',
};

function applyFilter(context: CanvasRenderingContext2D, width: number, height: number, filter: ScanFilter) {
    if (filter === 'color') return;
    const image = context.getImageData(0, 0, width, height);
    const data = image.data;
    const lum = new Uint8ClampedArray(width * height);
    const histogram = new Uint32Array(256);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        const v = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
        lum[p] = v;
        histogram[lum[p]]++;
    }
    let lo = 0;
    let hi = 255;
    if (filter === 'document') {
        // Stretch levels so the darkest 2% become black and the paper (brightest ~40%) turns white.
        const total = width * height;
        let count = 0;
        for (lo = 0; lo < 255 && (count += histogram[lo]) < total * 0.02; lo++);
        count = 0;
        for (hi = 255; hi > lo + 1 && (count += histogram[hi]) < total * 0.4; hi--);
    }
    const range = Math.max(1, hi - lo);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        let v = lum[p];
        if (filter === 'document') v = Math.pow(Math.min(1, Math.max(0, (v - lo) / range)), 1.4) * 255;
        data[i] = data[i + 1] = data[i + 2] = v;
    }
    context.putImageData(image, 0, 0);
}

/** Draws a page photo rotated, downscaled and filtered, and returns it as JPEG. */
async function preparePage(page: ScannedPage, filter: ScanFilter): Promise<{ jpeg: ArrayBuffer; width: number; height: number }> {
    const bitmap = await createImageBitmap(page.blob, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const sideways = page.rotation === 90 || page.rotation === 270;
    const canvas = document.createElement('canvas');
    canvas.width = sideways ? h : w;
    canvas.height = sideways ? w : h;
    const context = canvas.getContext('2d', { willReadFrequently: filter !== 'color' })!;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((page.rotation * Math.PI) / 180);
    context.drawImage(bitmap, -w / 2, -h / 2, w, h);
    context.setTransform(1, 0, 0, 1, 0, 0);
    bitmap.close();
    applyFilter(context, canvas.width, canvas.height, filter);
    const blob = await canvasToBlob(canvas, 'image/jpeg', filter === 'document' ? 0.8 : 0.85);
    const result = { jpeg: await blob.arrayBuffer(), width: canvas.width, height: canvas.height };
    releaseCanvas(canvas);
    return result;
}

/** Builds a PDF with one page per photo. A4 pages turn landscape for landscape photos. */
export async function buildScanPdf(
    pages: ScannedPage[],
    filter: ScanFilter,
    size: ScanPageSize,
    progress: (message: string) => void = () => {}
): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    doc.setTitle('Scanned document');
    for (let i = 0; i < pages.length; i++) {
        progress(`Processing page ${i + 1} of ${pages.length}...`);
        const { jpeg, width, height } = await preparePage(pages[i], filter);
        const image = await doc.embedJpg(jpeg);
        if (size === 'fit') {
            const pw = (width * 72) / FIT_DPI;
            const ph = (height * 72) / FIT_DPI;
            doc.addPage([pw, ph]).drawImage(image, { x: 0, y: 0, width: pw, height: ph });
            continue;
        }
        const [pw, ph] = width > height ? [A4[1], A4[0]] : A4;
        const fit = Math.min(pw / width, ph / height);
        const dw = width * fit;
        const dh = height * fit;
        doc.addPage([pw, ph]).drawImage(image, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh });
    }
    progress('Saving PDF...');
    return doc.save();
}
