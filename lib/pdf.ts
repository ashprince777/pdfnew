import {
    PDFDocument,
    PDFDict,
    PDFFont,
    PDFInvalidObject,
    PDFName,
    PDFNumber,
    PDFPage,
    PDFRef,
    PDFStream,
    EncryptedPDFError,
    degrees,
    type Degrees,
} from '@cantoo/pdf-lib';

export const PDF_MIME = 'application/pdf';

/** An error whose message is safe and helpful to show to the user as-is. */
export class PdfToolError extends Error {
    constructor(message: string, public readonly code: string = 'TOOL_ERROR') {
        super(message);
        this.name = 'PdfToolError';
    }
}

/** Returns a user-facing message for any error thrown while processing. */
export function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof PdfToolError) return error.message;
    return fallback;
}

type PdfInput = File | Blob | ArrayBuffer | Uint8Array;

async function toBytes(input: PdfInput): Promise<Uint8Array> {
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    return new Uint8Array(await input.arrayBuffer());
}

/**
 * Loads a PDF for editing. Encrypted files are rejected with a clear message,
 * because editing them without decrypting first produces corrupt output.
 */
export async function loadPdf(input: PdfInput): Promise<PDFDocument> {
    const bytes = await toBytes(input);
    try {
        return await PDFDocument.load(bytes, { updateMetadata: false });
    } catch (error) {
        if (error instanceof EncryptedPDFError) {
            throw new PdfToolError(
                'This PDF is password-protected or has security restrictions. Remove them with the Unlock PDF tool first, then try again.',
                'ENCRYPTED'
            );
        }
        throw new PdfToolError('This file is not a valid PDF or is too damaged to open.', 'INVALID_PDF');
    }
}

/** True when the file carries any PDF encryption (password or permission restrictions). */
export async function isPdfEncrypted(input: PdfInput): Promise<boolean> {
    const bytes = await toBytes(input);
    try {
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
        return doc.isEncrypted;
    } catch {
        return false;
    }
}

/**
 * Decrypts a PDF in place, keeping its text, vectors, links, bookmarks and forms intact.
 * `password` may be empty for files that only have permission restrictions.
 */
export async function decryptPdf(input: PdfInput, password: string): Promise<PDFDocument> {
    const bytes = await toBytes(input);
    let doc: PDFDocument;
    try {
        doc = await PDFDocument.load(bytes, { password, updateMetadata: false });
    } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (/password incorrect/i.test(message)) {
            throw new PdfToolError('Incorrect password. Please check it and try again.', 'BAD_PASSWORD');
        }
        if (/needs password/i.test(message)) {
            throw new PdfToolError('This PDF needs a password to open. Please enter it and try again.', 'PASSWORD_REQUIRED');
        }
        throw new PdfToolError('This PDF uses an unsupported encryption method or is damaged.', 'DECRYPT_FAILED');
    }
    removeEncryptionLeftovers(doc);
    return doc;
}

/**
 * After decryption, @cantoo/pdf-lib still carries the original file's cross-reference
 * streams, object streams and security dictionary as orphan objects. Left in place, the
 * old xref dictionary (which still says /Encrypt) makes the saved file look encrypted
 * to pdf-lib on the next load, so we drop them.
 */
function removeEncryptionLeftovers(doc: PDFDocument) {
    const typeKey = PDFName.of('Type');
    const leftoverTypes = [PDFName.of('XRef'), PDFName.of('ObjStm')];
    const standard = PDFName.of('Standard');

    for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
        if (obj instanceof PDFInvalidObject) {
            doc.context.delete(ref);
            continue;
        }
        const dict = obj instanceof PDFStream ? obj.dict : obj instanceof PDFDict ? obj : null;
        if (!dict) continue;
        const isSecurityHandler =
            dict.get(PDFName.of('Filter')) === standard && dict.has(PDFName.of('O')) && dict.has(PDFName.of('U'));
        const type = dict.get(typeKey);
        if (isSecurityHandler || (type instanceof PDFName && leftoverTypes.includes(type))) {
            doc.context.delete(ref);
        }
    }
}

export function pdfBytesToBlob(bytes: Uint8Array, type: string = PDF_MIME): Blob {
    return new Blob([bytes as Uint8Array<ArrayBuffer>], { type });
}

export async function savePdf(doc: PDFDocument): Promise<Blob> {
    return pdfBytesToBlob(await doc.save());
}

/** Strips the extension: "report.final.pdf" -> "report.final". */
export function baseName(filename: string | undefined, fallback = 'document'): string {
    if (!filename) return fallback;
    const stripped = filename.replace(/\.[^/.]+$/, '').trim();
    return stripped || fallback;
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Parses "1, 3-5, 9-7" into 1-based page numbers (ranges may run backwards).
 * Out-of-range or malformed parts are reported in `invalid` instead of being silently dropped.
 */
export function parsePageRanges(input: string, totalPages: number): { pages: number[]; invalid: string[] } {
    const pages: number[] = [];
    const invalid: string[] = [];

    for (const rawPart of input.split(',')) {
        const part = rawPart.trim();
        if (!part) continue;
        const match = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
        if (!match) {
            invalid.push(part);
            continue;
        }
        const start = parseInt(match[1], 10);
        const end = match[2] !== undefined ? parseInt(match[2], 10) : start;
        if (start < 1 || end < 1 || start > totalPages || end > totalPages) {
            invalid.push(part);
            continue;
        }
        const step = start <= end ? 1 : -1;
        for (let p = start; p !== end + step; p += step) pages.push(p);
    }

    return { pages, invalid };
}

const INHERITABLE_PAGE_KEYS = ['Resources', 'MediaBox', 'CropBox', 'Rotate'].map((key) => PDFName.of(key));

/**
 * Reorders/removes pages in place by rewriting the root page tree. Unlike copying pages
 * into a new document, this keeps bookmarks, form fields, metadata and attachments.
 * Each page must belong to `doc` and appear at most once.
 */
export function setPageOrder(doc: PDFDocument, pages: PDFPage[]) {
    if (pages.length === 0) throw new PdfToolError('A PDF must keep at least one page.');
    const rootRef = doc.catalog.get(PDFName.of('Pages'));
    if (!(rootRef instanceof PDFRef)) throw new Error('Unexpected page tree structure.');
    const root = doc.catalog.Pages();

    for (const page of pages) {
        // Pages nested in intermediate tree nodes may inherit these; make them explicit before flattening.
        for (const key of INHERITABLE_PAGE_KEYS) {
            if (!page.node.has(key)) {
                const inherited = page.node.getInheritableAttribute(key);
                if (inherited) page.node.set(key, inherited);
            }
        }
        page.node.set(PDFName.of('Parent'), rootRef);
    }
    root.set(PDFName.of('Kids'), doc.context.obj(pages.map((p) => p.ref)));
    root.set(PDFName.of('Count'), PDFNumber.of(pages.length));
}

// ---------------------------------------------------------------------------
// Unicode fonts
// ---------------------------------------------------------------------------

export type FontWeight = 'regular' | 'bold';

const FONT_URLS: Record<FontWeight, string> = {
    regular: '/fonts/NotoSans-Regular.ttf',
    bold: '/fonts/NotoSans-Bold.ttf',
};

const fontBytesCache = new Map<FontWeight, Promise<ArrayBuffer>>();

function fetchFontBytes(weight: FontWeight): Promise<ArrayBuffer> {
    let cached = fontBytesCache.get(weight);
    if (!cached) {
        cached = fetch(FONT_URLS[weight]).then((res) => {
            if (!res.ok) throw new Error(`Failed to load font ${FONT_URLS[weight]}`);
            return res.arrayBuffer();
        });
        cached.catch(() => fontBytesCache.delete(weight));
        fontBytesCache.set(weight, cached);
    }
    return cached;
}

/**
 * Embeds Noto Sans (Latin, Greek, Cyrillic, common symbols such as ₹ and €) so that
 * user text is not limited to the WinAnsi charset of the 14 standard PDF fonts.
 */
export async function embedUnicodeFont(doc: PDFDocument, weight: FontWeight = 'regular'): Promise<PDFFont> {
    const [{ default: fontkit }, bytes] = await Promise.all([import('@cantoo/fontkit'), fetchFontBytes(weight)]);
    doc.registerFontkit(fontkit);
    return doc.embedFont(bytes, { subset: true });
}

const supportedCharsCache = new WeakMap<PDFFont, Set<number>>();

/**
 * Replaces characters the font cannot draw (e.g. emoji, CJK) so drawText never throws.
 * Tabs become spaces and other control characters are removed.
 */
export function toDrawableText(font: PDFFont, text: string, replacement = '?'): string {
    let supported = supportedCharsCache.get(font);
    if (!supported) {
        supported = new Set(font.getCharacterSet());
        supportedCharsCache.set(font, supported);
    }
    let out = '';
    for (const char of text.replace(/\t/g, '    ')) {
        const code = char.codePointAt(0)!;
        if (code < 32) continue;
        out += supported.has(code) ? char : replacement;
    }
    return out;
}

/** Greedy word-wrap that also breaks words longer than the line. */
export function wrapText(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const paragraph of text.split('\n')) {
        let line = '';
        for (const word of paragraph.split(/\s+/).filter(Boolean)) {
            const candidate = line ? `${line} ${word}` : word;
            if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
                line = candidate;
                continue;
            }
            if (line) lines.push(line);
            // Hard-break words that are wider than a whole line.
            let rest = word;
            while (font.widthOfTextAtSize(rest, size) > maxWidth && rest.length > 1) {
                let cut = rest.length - 1;
                while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut--;
                lines.push(rest.slice(0, cut));
                rest = rest.slice(cut);
            }
            line = rest;
        }
        lines.push(line);
    }
    return lines;
}

// ---------------------------------------------------------------------------
// Page geometry
// ---------------------------------------------------------------------------

export interface VisualFrame {
    /** Width/height of the page as a viewer displays it (after /Rotate and CropBox). */
    width: number;
    height: number;
    /** Page rotation, normalised to 0, 90, 180 or 270. */
    rotation: number;
    /** Rotation to pass to drawText/drawImage/drawRectangle so content appears upright. */
    rotate: Degrees;
    /** Maps a point in displayed coordinates (origin bottom-left, y up) to PDF user space. */
    toPdf(x: number, y: number): { x: number; y: number };
    /** Inverse of `toPdf`: PDF user space to displayed coordinates (origin bottom-left, y up). */
    toVisual(x: number, y: number): { x: number; y: number };
}

/**
 * Describes a page the way the reader sees it. Positioning content through this frame
 * keeps stamps, numbers and signatures upright and in the right corner on rotated pages
 * and on pages whose CropBox does not start at (0, 0).
 */
export function getVisualFrame(page: PDFPage): VisualFrame {
    const box = page.getCropBox();
    const rotation = (((page.getRotation().angle % 360) + 360) % 360) as 0 | 90 | 180 | 270;
    const { x: x0, y: y0, width: w, height: h } = box;
    const swap = rotation === 90 || rotation === 270;

    const toPdf = (vx: number, vy: number) => {
        switch (rotation) {
            case 90:
                return { x: x0 + w - vy, y: y0 + vx };
            case 180:
                return { x: x0 + w - vx, y: y0 + h - vy };
            case 270:
                return { x: x0 + vy, y: y0 + h - vx };
            default:
                return { x: x0 + vx, y: y0 + vy };
        }
    };

    const toVisual = (px: number, py: number) => {
        const x = px - x0;
        const y = py - y0;
        switch (rotation) {
            case 90:
                return { x: y, y: w - x };
            case 180:
                return { x: w - x, y: h - y };
            case 270:
                return { x: h - y, y: x };
            default:
                return { x, y };
        }
    };

    return {
        width: swap ? h : w,
        height: swap ? w : h,
        rotation,
        rotate: degrees(rotation),
        toPdf,
        toVisual,
    };
}

export function hexToRgbComponents(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    const value = (i: number) => (parseInt(clean.substring(i, i + 2), 16) || 0) / 255;
    return [value(0), value(2), value(4)];
}
