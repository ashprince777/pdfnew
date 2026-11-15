/**
 * Fits a photo under a file-size limit (for form uploads): tries the highest JPEG quality that fits
 * at full size first, and only makes the picture smaller when quality alone is not enough.
 * Runs in the browser; nothing is uploaded.
 */

export interface FitOptions {
    /** Exact output size in pixels. With both set, the image is centre-cropped to that shape. */
    width?: number;
    height?: number;
    /** With both sizes set: 'cover' (default) trims the edges; 'contain' keeps the whole picture on white (signatures). */
    fit?: 'cover' | 'contain';
    /** Lines printed in black on a white strip at the bottom of the picture (e.g. name and photo date). */
    caption?: string[];
    /** Smallest acceptable file; when the best fit is below it, the top quality is used instead. */
    minBytes?: number;
}

export interface FitResult {
    blob: Blob;
    width: number;
    height: number;
    /** False when even the smallest readable version is over the limit (the smallest is returned). */
    reached: boolean;
}

const MIN_QUALITY = 0.35;
const MAX_QUALITY = 0.92;
/** Each step keeps this share of the previous width when quality alone cannot reach the limit. */
const SHRINK_STEP = 0.85;
/** Never shrink below this many pixels on the longer side. */
const MIN_LONG_SIDE = 80;

const toJpeg = (canvas: HTMLCanvasElement, quality: number) =>
    new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))), 'image/jpeg', quality));

/** Share of the picture height used by each caption line. */
const CAPTION_LINE = 0.085;

/**
 * Draws `bitmap` at w x h on white (JPEG has no transparency). 'cover' crops the centre if the shape
 * differs; 'contain' shows the whole picture. Caption lines go on a white strip at the bottom.
 */
function draw(bitmap: ImageBitmap, w: number, h: number, fit: 'cover' | 'contain', caption: string[]): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = 'high';

    const lineHeight = Math.max(9, Math.round(h * CAPTION_LINE));
    const strip = caption.length ? caption.length * lineHeight + Math.round(lineHeight * 0.4) : 0;
    const areaH = h - strip;
    const scale = fit === 'cover' ? Math.max(w / bitmap.width, areaH / bitmap.height) : Math.min(w / bitmap.width, areaH / bitmap.height);
    if (fit === 'cover') {
        const sw = w / scale;
        const sh = areaH / scale;
        ctx.drawImage(bitmap, (bitmap.width - sw) / 2, (bitmap.height - sh) / 2, sw, sh, 0, 0, w, areaH);
    } else {
        const dw = bitmap.width * scale;
        const dh = bitmap.height * scale;
        ctx.drawImage(bitmap, (w - dw) / 2, (areaH - dh) / 2, dw, dh);
    }

    if (strip) {
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        caption.forEach((line, i) => {
            // Shrink long names until they fit the width.
            let size = Math.round(lineHeight * 0.82);
            do ctx.font = `bold ${size}px Arial, Helvetica, sans-serif`;
            while (ctx.measureText(line).width > w - 6 && --size > 6);
            ctx.fillText(line, w / 2, areaH + Math.round(lineHeight * 0.2) + lineHeight * (i + 0.5));
        });
    }
    return canvas;
}

/** Highest quality that fits `targetBytes` at this canvas size, or null if even the lowest does not. */
async function bestQuality(canvas: HTMLCanvasElement, targetBytes: number): Promise<{ fit: Blob | null; smallest: Blob }> {
    const top = await toJpeg(canvas, MAX_QUALITY);
    if (top.size <= targetBytes) return { fit: top, smallest: top };
    const smallest = await toJpeg(canvas, MIN_QUALITY);
    if (smallest.size > targetBytes) return { fit: null, smallest };
    let fit = smallest;
    let lo = MIN_QUALITY;
    let hi = MAX_QUALITY;
    for (let i = 0; i < 6; i++) {
        const mid = (lo + hi) / 2;
        const blob = await toJpeg(canvas, mid);
        if (blob.size <= targetBytes) {
            fit = blob;
            lo = mid;
        } else {
            hi = mid;
        }
    }
    return { fit, smallest };
}

/** Re-encodes an image as a JPEG of at most `targetBytes`, applying the photo's EXIF rotation. */
export async function fitImageToSize(file: Blob, targetBytes: number, options: FitOptions = {}): Promise<FitResult> {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    try {
        const exact = Boolean(options.width || options.height);
        const caption = (options.caption ?? []).map((line) => line.trim()).filter(Boolean);
        let w = options.width ?? (options.height ? Math.round((bitmap.width * options.height) / bitmap.height) : bitmap.width);
        let h = options.height ?? (options.width ? Math.round((bitmap.height * options.width) / bitmap.width) : bitmap.height);
        let smallest: FitResult | null = null;
        for (;;) {
            const canvas = draw(bitmap, w, h, options.fit ?? 'cover', caption);
            const result = await bestQuality(canvas, targetBytes);
            // Forms with a minimum size (e.g. 10 to 20 KB): a small picture may need the top quality to reach it.
            if (result.fit && options.minBytes && result.fit.size < options.minBytes) {
                const top = await toJpeg(canvas, 1);
                if (top.size <= targetBytes) result.fit = top;
            }
            canvas.width = canvas.height = 0;
            if (result.fit) return { blob: result.fit, width: w, height: h, reached: true };
            smallest = { blob: result.smallest, width: w, height: h, reached: false };
            // Requested pixel sizes are kept as they are; otherwise try a smaller picture.
            if (exact || Math.max(w, h) * SHRINK_STEP < MIN_LONG_SIDE) return smallest;
            w = Math.max(1, Math.round(w * SHRINK_STEP));
            h = Math.max(1, Math.round(h * SHRINK_STEP));
        }
    } finally {
        bitmap.close();
    }
}
