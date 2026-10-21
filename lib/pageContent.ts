import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, PDFRef, PDFStream, decodePDFRawStream } from '@cantoo/pdf-lib';

/** 2D affine matrix [a, b, c, d, e, f] as used by PDF content streams. */
type Matrix = [number, number, number, number, number, number];

export interface PageImage {
    /** Resource name used by the page's content stream (e.g. "Im1"). */
    name: string;
    ref: PDFRef;
    /** Transformation that maps the image's unit square onto the page (PDF user space). */
    matrix: Matrix;
    /** Axis-aligned bounds in PDF user space. */
    bounds: { x: number; y: number; width: number; height: number };
}

const multiply = (m: Matrix, n: Matrix): Matrix => [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
];

const isWhite = (c: number) => c === 0x20 || c === 0x0a || c === 0x0d || c === 0x09 || c === 0x0c || c === 0x00;
const isDelimiter = (c: number) => '()<>[]{}/%'.includes(String.fromCharCode(c));

type Token = { kind: 'number'; value: number } | { kind: 'name'; value: string } | { kind: 'op'; value: string } | { kind: 'other' };

/**
 * Minimal content-stream tokenizer: enough to follow q/Q/cm and find `Do` operators.
 * Strings, hex strings, arrays, dictionaries and inline images are skipped safely.
 */
function* tokenize(data: Uint8Array): Generator<Token> {
    let i = 0;
    const n = data.length;
    while (i < n) {
        const c = data[i];
        if (isWhite(c)) {
            i++;
        } else if (c === 0x25 /* % comment */) {
            while (i < n && data[i] !== 0x0a && data[i] !== 0x0d) i++;
        } else if (c === 0x28 /* ( string */) {
            let depth = 0;
            for (; i < n; i++) {
                if (data[i] === 0x5c) i++;
                else if (data[i] === 0x28) depth++;
                else if (data[i] === 0x29 && --depth === 0) break;
            }
            i++;
            yield { kind: 'other' };
        } else if (c === 0x3c && data[i + 1] === 0x3c /* << dict >> */) {
            let depth = 0;
            for (; i < n - 1; i++) {
                if (data[i] === 0x3c && data[i + 1] === 0x3c) {
                    depth++;
                    i++;
                } else if (data[i] === 0x3e && data[i + 1] === 0x3e && --depth === 0) break;
            }
            i += 2;
            yield { kind: 'other' };
        } else if (c === 0x3c /* <hex> */) {
            while (i < n && data[i] !== 0x3e) i++;
            i++;
            yield { kind: 'other' };
        } else if (c === 0x5b || c === 0x5d || c === 0x7b || c === 0x7d) {
            i++;
            yield { kind: 'other' };
        } else if (c === 0x2f /* /Name */) {
            let j = i + 1;
            while (j < n && !isWhite(data[j]) && !isDelimiter(data[j])) j++;
            yield { kind: 'name', value: new TextDecoder('latin1').decode(data.subarray(i + 1, j)) };
            i = j;
        } else {
            let j = i;
            while (j < n && !isWhite(data[j]) && !isDelimiter(data[j])) j++;
            if (j === i) j++;
            const word = new TextDecoder('latin1').decode(data.subarray(i, j));
            i = j;
            const num = Number(word);
            if (word !== '' && !Number.isNaN(num) && /^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) {
                yield { kind: 'number', value: num };
            } else if (word === 'ID') {
                // Inline image data: skip binary bytes up to the "EI" operator.
                i++;
                while (i < n - 2 && !(data[i] === 0x45 && data[i + 1] === 0x49 && isWhite(data[i - 1]) && (isWhite(data[i + 2]) || i + 2 === n))) i++;
                i += 2;
                yield { kind: 'other' };
            } else {
                yield { kind: 'op', value: word };
            }
        }
    }
}

function pageContentBytes(doc: PDFDocument, pageIndex: number): Uint8Array {
    const node = doc.getPage(pageIndex).node;
    const contents = node.Contents();
    const streams: PDFStream[] = [];
    if (contents instanceof PDFStream) streams.push(contents);
    else if (contents instanceof PDFArray) {
        for (let i = 0; i < contents.size(); i++) {
            const s = doc.context.lookup(contents.get(i));
            if (s instanceof PDFStream) streams.push(s);
        }
    }
    const parts = streams.map((s) => (s instanceof PDFRawStream ? decodePDFRawStream(s).decode() : s.getContents()));
    const total = parts.reduce((sum, p) => sum + p.length + 1, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const p of parts) {
        out.set(p, offset);
        out[offset + p.length] = 0x0a;
        offset += p.length + 1;
    }
    return out;
}

function xObjects(doc: PDFDocument, pageIndex: number): PDFDict | undefined {
    const resources = doc.getPage(pageIndex).node.Resources();
    const xo = resources?.lookup(PDFName.of('XObject'));
    return xo instanceof PDFDict ? xo : undefined;
}

/** Finds every image drawn directly on a page, with its placement. */
export function findPageImages(doc: PDFDocument, pageIndex: number): PageImage[] {
    const dict = xObjects(doc, pageIndex);
    if (!dict) return [];
    const images: PageImage[] = [];
    const stack: Matrix[] = [];
    let ctm: Matrix = [1, 0, 0, 1, 0, 0];
    const operands: Token[] = [];

    for (const token of tokenize(pageContentBytes(doc, pageIndex))) {
        if (token.kind !== 'op') {
            operands.push(token);
            continue;
        }
        if (token.value === 'q') stack.push(ctm);
        else if (token.value === 'Q') ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
        else if (token.value === 'cm') {
            const nums = operands.slice(-6);
            if (nums.length === 6 && nums.every((t) => t.kind === 'number')) {
                ctm = multiply(nums.map((t) => (t as { value: number }).value) as Matrix, ctm);
            }
        } else if (token.value === 'Do') {
            const nameToken = operands[operands.length - 1];
            if (nameToken?.kind === 'name') {
                const ref = dict.get(PDFName.of(nameToken.value));
                const obj = ref instanceof PDFRef ? doc.context.lookup(ref) : undefined;
                if (ref instanceof PDFRef && obj instanceof PDFStream && obj.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')) {
                    const corners = [
                        [0, 0],
                        [1, 0],
                        [0, 1],
                        [1, 1],
                    ].map(([u, v]) => [ctm[0] * u + ctm[2] * v + ctm[4], ctm[1] * u + ctm[3] * v + ctm[5]]);
                    const xs = corners.map((p) => p[0]);
                    const ys = corners.map((p) => p[1]);
                    const bounds = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
                    if (bounds.width > 2 && bounds.height > 2) images.push({ name: nameToken.value, ref, matrix: ctm, bounds });
                }
            }
        }
        operands.length = 0;
    }
    return images;
}

/** Width/height ratio of an image as drawn (in its own orientation). */
export function drawnAspect(image: PageImage): number {
    const [a, b, c, d] = image.matrix;
    return Math.hypot(a, b) / Math.max(1e-6, Math.hypot(c, d));
}

/**
 * Points the page's image resource `name` at a new image. The page gets its own copy of its
 * resource dictionaries so other pages sharing them are unaffected, and the old image is
 * deleted from the file when nothing else uses it (so it cannot be recovered).
 */
export function replacePageImage(doc: PDFDocument, pageIndex: number, name: string, newImage: PDFRef) {
    const page = doc.getPage(pageIndex);
    const resources = page.node.Resources();
    const xo = xObjects(doc, pageIndex);
    if (!resources || !xo) throw new Error('Page has no image resources');
    const oldRef = xo.get(PDFName.of(name));

    const newXo = xo.clone(doc.context);
    newXo.set(PDFName.of(name), newImage);
    const newResources = resources.clone(doc.context);
    newResources.set(PDFName.of('XObject'), newXo);
    page.node.set(PDFName.of('Resources'), newResources);

    if (oldRef instanceof PDFRef && !isReferencedByAnyPage(doc, oldRef)) {
        const old = doc.context.lookup(oldRef);
        const smask = old instanceof PDFStream ? old.dict.get(PDFName.of('SMask')) : undefined;
        doc.context.delete(oldRef);
        if (smask instanceof PDFRef) doc.context.delete(smask);
    }
}

function isReferencedByAnyPage(doc: PDFDocument, ref: PDFRef): boolean {
    const usesRef = (resources: unknown) => {
        const dict = resources instanceof PDFRef ? doc.context.lookup(resources) : resources;
        if (!(dict instanceof PDFDict)) return false;
        const xo = dict.lookup(PDFName.of('XObject'));
        return xo instanceof PDFDict && xo.values().some((v) => v === ref);
    };
    if (doc.getPages().some((page) => usesRef(page.node.Resources()))) return true;
    // Form XObjects (reusable drawing groups) have their own resources.
    for (const [, obj] of doc.context.enumerateIndirectObjects()) {
        if (obj instanceof PDFStream && obj.dict.get(PDFName.of('Subtype')) === PDFName.of('Form') && usesRef(obj.dict.get(PDFName.of('Resources')))) {
            return true;
        }
    }
    return false;
}
