import {
    PDFArray,
    PDFDict,
    PDFDocument,
    PDFName,
    PDFNumber,
    PDFRawStream,
    PDFRef,
    decodePDFRawStream,
} from '@cantoo/pdf-lib';

export interface ImageCompressionOptions {
    /** Longest side, in pixels, that a re-encoded image may keep. */
    maxDimension: number;
    /** JPEG quality between 0 and 1. */
    quality: number;
    onProgress?: (done: number, total: number) => void;
}

export interface ImageCompressionStats {
    examined: number;
    recompressed: number;
    bytesSaved: number;
}

const N = {
    Subtype: PDFName.of('Subtype'),
    Image: PDFName.of('Image'),
    Filter: PDFName.of('Filter'),
    DCTDecode: PDFName.of('DCTDecode'),
    FlateDecode: PDFName.of('FlateDecode'),
    DecodeParms: PDFName.of('DecodeParms'),
    ColorSpace: PDFName.of('ColorSpace'),
    DeviceRGB: PDFName.of('DeviceRGB'),
    DeviceGray: PDFName.of('DeviceGray'),
    ICCBased: PDFName.of('ICCBased'),
    BitsPerComponent: PDFName.of('BitsPerComponent'),
    Width: PDFName.of('Width'),
    Height: PDFName.of('Height'),
    SMask: PDFName.of('SMask'),
    Mask: PDFName.of('Mask'),
    ImageMask: PDFName.of('ImageMask'),
    Decode: PDFName.of('Decode'),
    Predictor: PDFName.of('Predictor'),
    Colors: PDFName.of('Colors'),
    Columns: PDFName.of('Columns'),
    N: PDFName.of('N'),
};

/** Number of colour components for colour spaces we can safely re-encode as RGB JPEG (1 or 3), else null. */
function componentCount(doc: PDFDocument, dict: PDFDict): 1 | 3 | null {
    const cs = dict.get(N.ColorSpace);
    const resolved = cs instanceof PDFRef ? doc.context.lookup(cs) : cs;
    if (resolved === N.DeviceRGB) return 3;
    if (resolved === N.DeviceGray) return 1;
    if (resolved instanceof PDFArray && resolved.get(0) === N.ICCBased) {
        const profile = doc.context.lookup(resolved.get(1));
        const n = profile instanceof PDFRawStream ? profile.dict.get(N.N) : undefined;
        if (n instanceof PDFNumber && (n.asNumber() === 1 || n.asNumber() === 3)) return n.asNumber() as 1 | 3;
    }
    return null; // CMYK, Indexed, Lab, DeviceN... are left untouched
}

function numberOf(dict: PDFDict, key: PDFName): number | undefined {
    const value = dict.get(key);
    return value instanceof PDFNumber ? value.asNumber() : undefined;
}

/** Reverses PNG row predictors (PDF /Predictor >= 10). */
function undoPngPredictor(data: Uint8Array, columns: number, bytesPerPixel: number): Uint8Array | null {
    const rowLength = columns * bytesPerPixel;
    const rows = Math.floor(data.length / (rowLength + 1));
    const out = new Uint8Array(rows * rowLength);
    for (let r = 0; r < rows; r++) {
        const filter = data[r * (rowLength + 1)];
        const src = r * (rowLength + 1) + 1;
        const dst = r * rowLength;
        for (let i = 0; i < rowLength; i++) {
            const raw = data[src + i];
            const left = i >= bytesPerPixel ? out[dst + i - bytesPerPixel] : 0;
            const up = r > 0 ? out[dst - rowLength + i] : 0;
            const upLeft = r > 0 && i >= bytesPerPixel ? out[dst - rowLength + i - bytesPerPixel] : 0;
            let value: number;
            switch (filter) {
                case 0: value = raw; break;
                case 1: value = raw + left; break;
                case 2: value = raw + up; break;
                case 3: value = raw + ((left + up) >> 1); break;
                case 4: {
                    const p = left + up - upLeft;
                    const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
                    value = raw + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
                    break;
                }
                default: return null;
            }
            out[dst + i] = value & 0xff;
        }
    }
    return out;
}

/** Decodes a Flate image (8 bits per component, gray or RGB) into RGBA pixels. */
function decodeFlatePixels(stream: PDFRawStream, width: number, height: number, components: 1 | 3): ImageData | null {
    const parms = stream.dict.get(N.DecodeParms);
    const predictor = parms instanceof PDFDict ? numberOf(parms, N.Predictor) ?? 1 : 1;
    if (predictor !== 1 && predictor < 10) return null; // TIFF predictor not supported

    let data = decodePDFRawStream(stream).decode();
    if (predictor >= 10 && parms instanceof PDFDict) {
        const colors = numberOf(parms, N.Colors) ?? components;
        const columns = numberOf(parms, N.Columns) ?? width;
        const undone = undoPngPredictor(data, columns, colors);
        if (!undone) return null;
        data = undone;
    }
    if (data.length < width * height * components) return null;

    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0, p = 0; i < width * height; i++, p += components) {
        const o = i * 4;
        if (components === 1) {
            rgba[o] = rgba[o + 1] = rgba[o + 2] = data[p];
        } else {
            rgba[o] = data[p];
            rgba[o + 1] = data[p + 1];
            rgba[o + 2] = data[p + 2];
        }
        rgba[o + 3] = 255;
    }
    return new ImageData(rgba, width, height);
}

async function encodeJpeg(source: CanvasImageSource, srcWidth: number, srcHeight: number, options: ImageCompressionOptions) {
    const scale = Math.min(1, options.maxDimension / Math.max(srcWidth, srcHeight));
    const width = Math.max(1, Math.round(srcWidth * scale));
    const height = Math.max(1, Math.round(srcHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(source, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', options.quality));
    canvas.width = canvas.height = 0;
    if (!blob) return null;
    return { bytes: new Uint8Array(await blob.arrayBuffer()), width, height };
}

/**
 * Re-encodes large embedded photos/scans as smaller JPEGs. Text, vector graphics,
 * links and bookmarks are untouched, so the document stays searchable.
 * Images we cannot convert faithfully (CMYK, indexed, masks, soft masks) are skipped.
 */
export async function recompressImages(doc: PDFDocument, options: ImageCompressionOptions): Promise<ImageCompressionStats> {
    const stats: ImageCompressionStats = { examined: 0, recompressed: 0, bytesSaved: 0 };

    const softMaskRefs = new Set<string>();
    const candidates: [PDFRef, PDFRawStream][] = [];
    for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
        if (!(obj instanceof PDFRawStream) || obj.dict.get(N.Subtype) !== N.Image) continue;
        const smask = obj.dict.get(N.SMask);
        if (smask instanceof PDFRef) softMaskRefs.add(smask.toString());
        candidates.push([ref, obj]);
    }

    for (let index = 0; index < candidates.length; index++) {
        const [ref, stream] = candidates[index];
        options.onProgress?.(index + 1, candidates.length);
        if (softMaskRefs.has(ref.toString())) continue;

        const dict = stream.dict;
        const width = numberOf(dict, N.Width);
        const height = numberOf(dict, N.Height);
        if (!width || !height || dict.has(N.ImageMask) || dict.has(N.Mask) || dict.has(N.Decode)) continue;
        if (numberOf(dict, N.BitsPerComponent) !== 8) continue;
        const components = componentCount(doc, dict);
        if (!components) continue;

        const filter = dict.get(N.Filter);
        const filterName = filter instanceof PDFArray && filter.size() === 1 ? filter.get(0) : filter;
        const originalSize = stream.getContentsSize();
        if (originalSize < 20 * 1024) continue; // small images are not worth it
        stats.examined++;

        try {
            let encoded: Awaited<ReturnType<typeof encodeJpeg>> = null;
            if (filterName === N.DCTDecode) {
                const bitmap = await createImageBitmap(new Blob([stream.getContents() as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' }));
                encoded = await encodeJpeg(bitmap, bitmap.width, bitmap.height, options);
                bitmap.close();
            } else if (filterName === N.FlateDecode) {
                const pixels = decodeFlatePixels(stream, width, height, components);
                if (!pixels) continue;
                const bitmap = await createImageBitmap(pixels);
                encoded = await encodeJpeg(bitmap, width, height, options);
                bitmap.close();
            }
            if (!encoded || encoded.bytes.length > originalSize * 0.9) continue;

            const newDict = dict.clone(doc.context);
            newDict.set(N.Filter, N.DCTDecode);
            newDict.delete(N.DecodeParms);
            newDict.set(N.ColorSpace, N.DeviceRGB);
            newDict.set(N.BitsPerComponent, PDFNumber.of(8));
            newDict.set(N.Width, PDFNumber.of(encoded.width));
            newDict.set(N.Height, PDFNumber.of(encoded.height));
            doc.context.assign(ref, PDFRawStream.of(newDict, encoded.bytes));

            stats.recompressed++;
            stats.bytesSaved += originalSize - encoded.bytes.length;
        } catch (error) {
            console.warn('Skipping image that could not be recompressed', ref.toString(), error);
        }
    }

    return stats;
}
