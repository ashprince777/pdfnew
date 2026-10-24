import { PDFArray, PDFDict, PDFName, PDFNumber, PDFRawStream, decodePDFRawStream, type PDFDocument } from '@cantoo/pdf-lib';
import { findPageImages, replacePageImage, type PageImage } from './pageContent';
import type { UserBox } from './textRemoval';

/**
 * Paints white into the pixels of page images (typically scans) under the given boxes, so words
 * covered by Whiteout or replaced via OCR are really gone from the picture, not just hidden under
 * a white rectangle. Each changed image is re-encoded and swapped in; the old one is deleted.
 *
 * Supports JPEG (DCTDecode) and Flate/uncompressed images in DeviceGray or DeviceRGB at 8 bits, and
 * 1-bit black-and-white. Other encodings (CCITT fax, JBIG2, CMYK, images with masks) are left as
 * they are; the caller still draws the white box on top. Returns how many images were cleaned.
 */
export async function whiteoutImagesInBoxes(doc: PDFDocument, pageIndex: number, boxes: UserBox[]): Promise<number> {
    let cleaned = 0;
    for (const image of findPageImages(doc, pageIndex)) {
        const hits = boxes.filter((b) => overlaps(b, image.bounds));
        if (!hits.length) continue;
        const stream = doc.context.lookup(image.ref);
        if (!(stream instanceof PDFRawStream)) continue;
        const decoded = await decodeImage(stream);
        if (!decoded) continue;

        const { canvas, kind } = decoded;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        for (const box of hits) {
            const rect = boxToPixels(image, box, canvas.width, canvas.height);
            if (rect) ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        }

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, kind === 'jpeg' ? 'image/jpeg' : 'image/png', 0.9));
        canvas.width = canvas.height = 0;
        if (!blob) continue;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const embedded = kind === 'jpeg' ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
        // Embedded images are written on save; register the object now so it can be referenced.
        await embedded.embed();
        replacePageImage(doc, pageIndex, image.name, embedded.ref);
        cleaned++;
    }
    return cleaned;
}

const overlaps = (b: UserBox, r: { x: number; y: number; width: number; height: number }) =>
    b.x0 < r.x + r.width && b.x1 > r.x && b.y0 < r.y + r.height && b.y1 > r.y;

/** Maps a page-space box to a pixel rectangle in the image (image row 0 is the top edge). */
function boxToPixels(image: PageImage, box: UserBox, width: number, height: number) {
    const [a, b, c, d, e, f] = image.matrix;
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-9) return null;
    const toUnit = (x: number, y: number) => {
        const dx = x - e;
        const dy = y - f;
        return [(d * dx - c * dy) / det, (-b * dx + a * dy) / det];
    };
    const corners = [toUnit(box.x0, box.y0), toUnit(box.x1, box.y0), toUnit(box.x0, box.y1), toUnit(box.x1, box.y1)];
    const us = corners.map((p) => p[0]);
    const vs = corners.map((p) => p[1]);
    const x0 = Math.max(0, Math.floor(Math.min(...us) * width) - 1);
    const x1 = Math.min(width, Math.ceil(Math.max(...us) * width) + 1);
    const y0 = Math.max(0, Math.floor((1 - Math.max(...vs)) * height) - 1);
    const y1 = Math.min(height, Math.ceil((1 - Math.min(...vs)) * height) + 1);
    if (x1 <= x0 || y1 <= y0) return null;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

const filterNames = (dict: PDFDict): string[] => {
    const filter = dict.get(PDFName.of('Filter'));
    if (filter instanceof PDFName) return [filter.decodeText()];
    if (filter instanceof PDFArray) return filter.asArray().map((f) => (f instanceof PDFName ? f.decodeText() : ''));
    return [];
};

const num = (dict: PDFDict, key: string) => {
    const v = dict.lookup(PDFName.of(key));
    return v instanceof PDFNumber ? v.asNumber() : undefined;
};

async function decodeImage(stream: PDFRawStream): Promise<{ canvas: HTMLCanvasElement; kind: 'jpeg' | 'png' } | null> {
    const dict = stream.dict;
    // Images with soft masks or explicit masks would lose their transparency; leave them alone.
    if (dict.has(PDFName.of('SMask')) || dict.has(PDFName.of('Mask'))) return null;
    const filters = filterNames(dict);
    const width = num(dict, 'Width');
    const height = num(dict, 'Height');
    if (!width || !height) return null;
    const colorSpace = dict.lookup(PDFName.of('ColorSpace'));
    const cs = colorSpace instanceof PDFName ? colorSpace.decodeText() : '';

    if (filters.length === 1 && filters[0] === 'DCTDecode') {
        if (cs === 'DeviceCMYK') return null;
        const bitmap = await createImageBitmap(new Blob([stream.contents as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' }));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        return { canvas, kind: 'jpeg' };
    }

    if (!filters.every((f) => f === 'FlateDecode' || f === 'LZWDecode')) return null;
    // PNG/TIFF predictors need an extra decoding step we don't implement; leave those images alone.
    const parms = dict.lookup(PDFName.of('DecodeParms'));
    const parmDict = parms instanceof PDFArray ? parms.lookup(0) : parms;
    if (parmDict instanceof PDFDict && (num(parmDict, 'Predictor') ?? 1) > 1) return null;
    const bpc = num(dict, 'BitsPerComponent') ?? 8;
    const channels = cs === 'DeviceRGB' ? 3 : cs === 'DeviceGray' ? 1 : 0;
    if (!channels || (bpc !== 8 && !(bpc === 1 && channels === 1))) return null;
    const decodeArray = dict.lookup(PDFName.of('Decode'));
    const first = decodeArray instanceof PDFArray ? decodeArray.lookup(0) : undefined;
    const inverted = first instanceof PDFNumber && first.asNumber() === 1;

    const raw = decodePDFRawStream(stream).decode();
    const rgba = new Uint8ClampedArray(width * height * 4);
    if (bpc === 8) {
        if (raw.length < width * height * channels) return null;
        for (let i = 0, p = 0; i < width * height; i++, p += channels) {
            const r = raw[p];
            const g = channels === 3 ? raw[p + 1] : r;
            const b = channels === 3 ? raw[p + 2] : r;
            rgba.set(inverted ? [255 - r, 255 - g, 255 - b, 255] : [r, g, b, 255], i * 4);
        }
    } else {
        const rowBytes = Math.ceil(width / 8);
        if (raw.length < rowBytes * height) return null;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let bit = (raw[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1;
                if (inverted) bit = 1 - bit;
                const v = bit ? 255 : 0;
                rgba.set([v, v, v, 255], (y * width + x) * 4);
            }
        }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')!.putImageData(new ImageData(rgba, width, height), 0, 0);
    return { canvas, kind: 'png' };
}
