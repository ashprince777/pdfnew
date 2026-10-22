import { PDFDict, PDFName, type PDFDocument } from '@cantoo/pdf-lib';
import type { PDFPageProxy } from 'pdfjs-dist';
import { loadPdf } from './pdf';
import { canvasToBlob, getPdfjs, openPdfjsDocument, releaseCanvas, renderPageToCanvas } from './pdfjs';

/** An area to black out, as fractions (0-1) of the page as displayed, from the top-left corner. */
export interface RedactBox {
    page: number;
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface RedactOptions {
    /** Also remove the title/author metadata, XMP metadata and attached files. */
    stripHiddenInfo: boolean;
    /** Resolution used for redacted pages. */
    dpi?: number;
}

interface PositionedText {
    str: string;
    transform: number[];
    width: number;
}

async function textBoxesOnPage(page: PDFPageProxy, needle: string): Promise<Omit<RedactBox, 'page'>[]> {
    const { Util } = await getPdfjs();
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const boxes: Omit<RedactBox, 'page'>[] = [];
    for (const item of content.items as PositionedText[]) {
        if (!item.str || item.width <= 0) continue;
        const haystack = item.str.toLowerCase();
        let index = haystack.indexOf(needle);
        if (index < 0) continue;
        const m = Util.transform(viewport.transform, item.transform);
        // Unit vectors along the text baseline and towards the top of the glyphs, in viewport space.
        const along = Math.hypot(m[0], m[1]) || 1;
        const height = Math.hypot(m[2], m[3]) || 1;
        const [ux, uy, vx, vy] = [m[0] / along, m[1] / along, m[2] / height, m[3] / height];
        // Glyph widths are not exposed, so positions inside a run are proportional (padded below).
        const charWidth = item.width / item.str.length;
        while (index >= 0) {
            const start = index * charWidth;
            const end = (index + needle.length) * charWidth;
            const xs: number[] = [];
            const ys: number[] = [];
            for (const a of [start, end]) {
                for (const b of [-0.3 * height, 1.05 * height]) {
                    xs.push(m[4] + ux * a + vx * b);
                    ys.push(m[5] + uy * a + vy * b);
                }
            }
            const pad = 1.5;
            const left = Math.max(0, Math.min(...xs) - pad);
            const top = Math.max(0, Math.min(...ys) - pad);
            const right = Math.min(viewport.width, Math.max(...xs) + pad);
            const bottom = Math.min(viewport.height, Math.max(...ys) + pad);
            boxes.push({ x: left / viewport.width, y: top / viewport.height, w: (right - left) / viewport.width, h: (bottom - top) / viewport.height });
            index = haystack.indexOf(needle, index + needle.length);
        }
    }
    return boxes;
}

/** Finds every occurrence of `query` (case-insensitive) and returns a box around each one. */
export async function findTextToRedact(file: File, query: string): Promise<RedactBox[]> {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const doc = await openPdfjsDocument(await file.arrayBuffer());
    try {
        const boxes: RedactBox[] = [];
        for (let n = 1; n <= doc.numPages; n++) {
            const page = await doc.getPage(n);
            boxes.push(...(await textBoxesOnPage(page, needle)).map((box) => ({ ...box, page: n })));
            page.cleanup();
        }
        return boxes;
    } finally {
        await doc.destroy();
    }
}

function removeHiddenInfo(doc: PDFDocument) {
    const infoRef = doc.context.trailerInfo.Info;
    const info = infoRef ? doc.context.lookupMaybe(infoRef, PDFDict) : undefined;
    info?.keys().forEach((key) => info.delete(key));
    doc.catalog.delete(PDFName.of('Metadata'));
    doc.catalog.delete(PDFName.of('PieceInfo'));
    const names = doc.catalog.lookupMaybe(PDFName.of('Names'), PDFDict);
    names?.delete(PDFName.of('EmbeddedFiles'));
    names?.delete(PDFName.of('JavaScript'));
}

/** Drops form fields that have a widget on this page, so no field value survives redaction. */
function removeFieldsOnPage(doc: PDFDocument, pageIndex: number) {
    if (!doc.catalog.has(PDFName.of('AcroForm'))) return;
    const page = doc.getPage(pageIndex);
    const annots = new Set((page.node.Annots()?.asArray() ?? []).map((ref) => doc.context.lookup(ref)));
    const form = doc.getForm();
    for (const field of form.getFields()) {
        const onPage = field.acroField.getWidgets().some((widget) => widget.P() === page.ref || annots.has(widget.dict));
        if (onPage) form.removeField(field);
    }
}

/**
 * True redaction: every page with a redaction is re-drawn as an image with the areas blacked out,
 * so the text, vector graphics, annotations and form values underneath are gone, not just covered.
 * Pages without redactions are kept unchanged.
 */
export async function redactPdf(
    file: File,
    boxes: RedactBox[],
    options: RedactOptions,
    progress: (message: string) => void = () => {}
): Promise<Uint8Array> {
    const bytes = await file.arrayBuffer();
    const [doc, rendered] = await Promise.all([loadPdf(bytes), openPdfjsDocument(bytes)]);
    const scale = (options.dpi ?? 200) / 72;
    const pages = Array.from(new Set(boxes.map((box) => box.page))).sort((a, b) => a - b);
    try {
        for (let i = 0; i < pages.length; i++) {
            const n = pages[i];
            progress(`Redacting page ${n} (${i + 1} of ${pages.length})...`);
            const page = await rendered.getPage(n);
            const size = page.getViewport({ scale: 1 });
            const canvas = await renderPageToCanvas(page, scale);
            const context = canvas.getContext('2d')!;
            context.fillStyle = '#000000';
            for (const box of boxes.filter((b) => b.page === n)) {
                context.fillRect(
                    Math.floor(box.x * canvas.width),
                    Math.floor(box.y * canvas.height),
                    Math.ceil(box.w * canvas.width) + 1,
                    Math.ceil(box.h * canvas.height) + 1
                );
            }
            const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.92);
            releaseCanvas(canvas);
            page.cleanup();

            const image = await doc.embedJpg(await jpeg.arrayBuffer());
            removeFieldsOnPage(doc, n - 1);
            const replacement = doc.insertPage(n - 1, [size.width, size.height]);
            replacement.drawImage(image, { x: 0, y: 0, width: size.width, height: size.height });
            doc.removePage(n);
        }
        if (options.stripHiddenInfo) removeHiddenInfo(doc);
        progress('Saving redacted PDF...');
        return await doc.save();
    } finally {
        await rendered.destroy();
    }
}
