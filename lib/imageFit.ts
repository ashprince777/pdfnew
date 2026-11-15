/**
 * Fits a photo under a file-size limit (for form uploads): tries the highest JPEG quality that fits
 * at full size first, and only makes the picture smaller when quality alone is not enough.
 * Runs in the browser; nothing is uploaded.
 */

export interface FitOptions {
    /** Exact output size in pixels. With both set, the image is centre-cropped to that shape. */
    width?: number;
    height?: number;
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

/** Draws `bitmap` at w x h on white (JPEG has no transparency), cropping the centre if the shape differs. */
function draw(bitmap: ImageBitmap, w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = 'high';
    const scale = Math.max(w / bitmap.width, h / bitmap.height);
    const sw = w / scale;
    const sh = h / scale;
    ctx.drawImage(bitmap, (bitmap.width - sw) / 2, (bitmap.height - sh) / 2, sw, sh, 0, 0, w, h);
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
        let w = options.width ?? (options.height ? Math.round((bitmap.width * options.height) / bitmap.height) : bitmap.width);
        let h = options.height ?? (options.width ? Math.round((bitmap.height * options.width) / bitmap.width) : bitmap.height);
        let smallest: FitResult | null = null;
        for (;;) {
            const canvas = draw(bitmap, w, h);
            const result = await bestQuality(canvas, targetBytes);
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
