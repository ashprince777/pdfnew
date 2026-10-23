import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream, PDFRef, PDFStream, decodePDFRawStream } from '@cantoo/pdf-lib';

/**
 * Removes the text glyphs that sit inside given boxes from a page's content stream, so text that
 * was edited or whited out is really gone from the file (not just painted over).
 *
 * Every text-showing operator (Tj, TJ, ' and ") is rewritten glyph by glyph: glyphs whose centre
 * falls inside a box are replaced by an equal amount of empty space (a TJ offset), so all other
 * text on the page keeps its exact position. Text inside form XObjects and text drawn as images
 * (scans) is not affected.
 */

/** Axis-aligned box in PDF user space. */
export interface UserBox {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const multiply = (m: Matrix, n: Matrix): Matrix => [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
];
const apply = (m: Matrix, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

// ---------------------------------------------------------------------------------------------
// Tokenizer (keeps byte offsets so untouched parts of the stream are copied verbatim)

type Tok =
    | { t: 'num'; v: number; s: number; e: number }
    | { t: 'name'; v: string; s: number; e: number }
    | { t: 'str'; v: Uint8Array; s: number; e: number }
    | { t: '['; s: number; e: number }
    | { t: ']'; s: number; e: number }
    | { t: 'op'; v: string; s: number; e: number }
    | { t: 'other'; s: number; e: number };

const isWhite = (c: number) => c === 0x20 || c === 0x0a || c === 0x0d || c === 0x09 || c === 0x0c || c === 0x00;
const isDelim = (c: number) => c === 0x28 || c === 0x29 || c === 0x3c || c === 0x3e || c === 0x5b || c === 0x5d || c === 0x7b || c === 0x7d || c === 0x2f || c === 0x25;
const latin1 = (b: Uint8Array) => {
    let s = '';
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return s;
};

function readLiteral(data: Uint8Array, start: number): { bytes: Uint8Array; end: number } {
    const out: number[] = [];
    let i = start + 1;
    let depth = 1;
    while (i < data.length) {
        const c = data[i];
        if (c === 0x5c) {
            const n = data[i + 1];
            i += 2;
            if (n === 0x6e) out.push(0x0a);
            else if (n === 0x72) out.push(0x0d);
            else if (n === 0x74) out.push(0x09);
            else if (n === 0x62) out.push(0x08);
            else if (n === 0x66) out.push(0x0c);
            else if (n === 0x0d) {
                if (data[i] === 0x0a) i++;
            } else if (n === 0x0a) {
                /* line continuation */
            } else if (n >= 0x30 && n <= 0x37) {
                let v = n - 0x30;
                for (let k = 0; k < 2 && data[i] >= 0x30 && data[i] <= 0x37; k++) v = v * 8 + (data[i++] - 0x30);
                out.push(v & 0xff);
            } else if (n !== undefined) out.push(n);
            continue;
        }
        if (c === 0x28) depth++;
        else if (c === 0x29 && --depth === 0) return { bytes: Uint8Array.from(out), end: i + 1 };
        out.push(c);
        i++;
    }
    return { bytes: Uint8Array.from(out), end: data.length };
}

function* tokenize(data: Uint8Array): Generator<Tok> {
    let i = 0;
    const n = data.length;
    while (i < n) {
        const c = data[i];
        if (isWhite(c)) {
            i++;
        } else if (c === 0x25) {
            while (i < n && data[i] !== 0x0a && data[i] !== 0x0d) i++;
        } else if (c === 0x28) {
            const { bytes, end } = readLiteral(data, i);
            yield { t: 'str', v: bytes, s: i, e: end };
            i = end;
        } else if (c === 0x3c && data[i + 1] === 0x3c) {
            const s = i;
            let depth = 0;
            for (; i < n - 1; i++) {
                if (data[i] === 0x3c && data[i + 1] === 0x3c) {
                    depth++;
                    i++;
                } else if (data[i] === 0x3e && data[i + 1] === 0x3e && --depth === 0) break;
            }
            i += 2;
            yield { t: 'other', s, e: i };
        } else if (c === 0x3c) {
            const s = i;
            let hex = '';
            i++;
            while (i < n && data[i] !== 0x3e) {
                if (!isWhite(data[i])) hex += String.fromCharCode(data[i]);
                i++;
            }
            i++;
            if (hex.length % 2) hex += '0';
            const bytes = new Uint8Array(hex.length / 2);
            for (let k = 0; k < bytes.length; k++) bytes[k] = parseInt(hex.substr(k * 2, 2), 16) || 0;
            yield { t: 'str', v: bytes, s, e: i };
        } else if (c === 0x5b) {
            yield { t: '[', s: i, e: i + 1 };
            i++;
        } else if (c === 0x5d) {
            yield { t: ']', s: i, e: i + 1 };
            i++;
        } else if (c === 0x7b || c === 0x7d || c === 0x29 || c === 0x3e) {
            yield { t: 'other', s: i, e: i + 1 };
            i++;
        } else if (c === 0x2f) {
            let j = i + 1;
            while (j < n && !isWhite(data[j]) && !isDelim(data[j])) j++;
            yield { t: 'name', v: latin1(data.subarray(i + 1, j)), s: i, e: j };
            i = j;
        } else {
            let j = i;
            while (j < n && !isWhite(data[j]) && !isDelim(data[j])) j++;
            if (j === i) j++;
            const word = latin1(data.subarray(i, j));
            const s = i;
            i = j;
            if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) {
                yield { t: 'num', v: Number(word), s, e: j };
            } else if (word === 'BI') {
                // Inline image: skip everything up to and including "EI".
                while (i < n - 1 && !(data[i] === 0x45 && data[i + 1] === 0x49 && isWhite(data[i - 1]) && (i + 2 >= n || isWhite(data[i + 2])))) i++;
                i += 2;
                yield { t: 'other', s, e: i };
            } else {
                yield { t: 'op', v: word, s, e: j };
            }
        }
    }
}

// ---------------------------------------------------------------------------------------------
// Fonts: glyph widths in 1/1000 em

interface FontInfo {
    /** Bytes per character code (1 for simple fonts, 2 for Type0/CID fonts). */
    bytes: 1 | 2;
    width: (code: number) => number;
}

type StdFonts = typeof import('@cantoo/pdf-lib/standard-fonts');

const STANDARD_14 = new Set([
    'Courier',
    'Courier-Bold',
    'Courier-BoldOblique',
    'Courier-Oblique',
    'Helvetica',
    'Helvetica-Bold',
    'Helvetica-BoldOblique',
    'Helvetica-Oblique',
    'Times-Roman',
    'Times-Bold',
    'Times-BoldItalic',
    'Times-Italic',
    'Symbol',
    'ZapfDingbats',
]);
const STANDARD_ALIASES: Record<string, string> = {
    Arial: 'Helvetica',
    'Arial,Bold': 'Helvetica-Bold',
    'Arial,Italic': 'Helvetica-Oblique',
    'Arial,BoldItalic': 'Helvetica-BoldOblique',
    TimesNewRoman: 'Times-Roman',
    'TimesNewRoman,Bold': 'Times-Bold',
    CourierNew: 'Courier',
};

const num = (doc: PDFDocument, v: unknown): number | undefined => {
    const o = v instanceof PDFRef ? doc.context.lookup(v) : v;
    return o instanceof PDFNumber ? o.asNumber() : undefined;
};
const dictOf = (doc: PDFDocument, v: unknown): PDFDict | undefined => {
    const o = v instanceof PDFRef ? doc.context.lookup(v) : v;
    return o instanceof PDFDict ? o : undefined;
};
const arrayOf = (doc: PDFDocument, v: unknown): PDFArray | undefined => {
    const o = v instanceof PDFRef ? doc.context.lookup(v) : v;
    return o instanceof PDFArray ? o : undefined;
};

function fontInfo(doc: PDFDocument, font: PDFDict | undefined, std: StdFonts | null): FontInfo {
    const fallback: FontInfo = { bytes: 1, width: () => 500 };
    if (!font) return fallback;
    const subtype = font.get(PDFName.of('Subtype'));
    if (subtype === PDFName.of('Type0')) {
        const desc = dictOf(doc, arrayOf(doc, font.get(PDFName.of('DescendantFonts')))?.get(0));
        const dw = num(doc, desc?.get(PDFName.of('DW'))) ?? 1000;
        const widths = new Map<number, number>();
        const w = arrayOf(doc, desc?.get(PDFName.of('W')));
        if (w) {
            for (let i = 0; i < w.size(); ) {
                const first = num(doc, w.get(i));
                const next = w.get(i + 1);
                const list = arrayOf(doc, next);
                if (first === undefined) break;
                if (list) {
                    for (let k = 0; k < list.size(); k++) widths.set(first + k, num(doc, list.get(k)) ?? dw);
                    i += 2;
                } else {
                    const last = num(doc, next);
                    const value = num(doc, w.get(i + 2)) ?? dw;
                    if (last !== undefined) for (let c = first; c <= last && c - first < 65536; c++) widths.set(c, value);
                    i += 3;
                }
            }
        }
        return { bytes: 2, width: (code) => widths.get(code) ?? dw };
    }

    const widthsArr = arrayOf(doc, font.get(PDFName.of('Widths')));
    const firstChar = num(doc, font.get(PDFName.of('FirstChar'))) ?? 0;
    const descriptor = dictOf(doc, font.get(PDFName.of('FontDescriptor')));
    const missing = num(doc, descriptor?.get(PDFName.of('MissingWidth'))) ?? 0;
    if (widthsArr && widthsArr.size() > 0) {
        const widths = Array.from({ length: widthsArr.size() }, (_, k) => num(doc, widthsArr.get(k)) ?? missing);
        return { bytes: 1, width: (code) => widths[code - firstChar] ?? missing };
    }

    // Standard 14 fonts may omit /Widths: use the built-in AFM metrics.
    const base = font.get(PDFName.of('BaseFont'));
    const baseName = base instanceof PDFName ? base.decodeText().replace(/^[A-Z]{6}\+/, '') : '';
    const stdName = STANDARD_14.has(baseName) ? baseName : STANDARD_ALIASES[baseName];
    if (std && stdName) {
        const metrics = std.Font.load(stdName as Parameters<StdFonts['Font']['load']>[0]);
        const codeToName = new Map<number, string>();
        for (const cp of std.Encodings.WinAnsi.supportedCodePoints) {
            const { code, name } = std.Encodings.WinAnsi.encodeUnicodeCodePoint(cp);
            if (!codeToName.has(code)) codeToName.set(code, name);
        }
        return { bytes: 1, width: (code) => metrics.getWidthOfGlyph(codeToName.get(code) ?? '') || 500 };
    }
    return fallback;
}

// ---------------------------------------------------------------------------------------------
// Content stream rewrite

function readPageContent(doc: PDFDocument, pageIndex: number): Uint8Array | null {
    const contents = doc.getPage(pageIndex).node.Contents();
    const streams: PDFStream[] = [];
    if (contents instanceof PDFStream) streams.push(contents);
    else if (contents instanceof PDFArray) {
        for (let i = 0; i < contents.size(); i++) {
            const s = doc.context.lookup(contents.get(i));
            if (s instanceof PDFStream) streams.push(s);
        }
    }
    if (!streams.length) return null;
    const parts = streams.map((s) => (s instanceof PDFRawStream ? decodePDFRawStream(s).decode() : s.getContents()));
    const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length + 1, 0));
    let offset = 0;
    for (const p of parts) {
        out.set(p, offset);
        out[offset + p.length] = 0x0a;
        offset += p.length + 1;
    }
    return out;
}

const hex = (bytes: Uint8Array) => '<' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('') + '>';
const fmt = (n: number) => (Math.round(n * 1000) / 1000).toString();

interface TextState {
    fontName: string;
    size: number;
    charSpacing: number;
    wordSpacing: number;
    scale: number;
    leading: number;
    rise: number;
}

/**
 * Removes glyphs inside `boxes` (PDF user space of page `pageIndex`). Returns the number of glyphs
 * removed. The page's content streams are replaced by one rewritten stream only when something changed.
 */
export async function removeTextInBoxes(doc: PDFDocument, pageIndex: number, boxes: UserBox[]): Promise<number> {
    if (!boxes.length) return 0;
    const data = readPageContent(doc, pageIndex);
    if (!data) return 0;

    const page = doc.getPage(pageIndex);
    const fontsDict = dictOf(doc, page.node.Resources()?.get(PDFName.of('Font')));
    let std: StdFonts | null = null;
    const fonts = new Map<string, FontInfo>();
    const getFont = async (name: string) => {
        let info = fonts.get(name);
        if (!info) {
            const dict = dictOf(doc, fontsDict?.get(PDFName.of(name)));
            const needsStd = dict && !dict.get(PDFName.of('Widths')) && dict.get(PDFName.of('Subtype')) !== PDFName.of('Type0');
            if (needsStd && !std) std = await import('@cantoo/pdf-lib/standard-fonts');
            info = fontInfo(doc, dict, std);
            fonts.set(name, info);
        }
        return info;
    };

    const inside = (x: number, y: number) => boxes.some((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);

    let ctm: Matrix = IDENTITY;
    let ts: TextState = { fontName: '', size: 0, charSpacing: 0, wordSpacing: 0, scale: 1, leading: 0, rise: 0 };
    const stack: { ctm: Matrix; ts: TextState }[] = [];
    let tm: Matrix = IDENTITY;
    let tlm: Matrix = IDENTITY;

    const edits: { s: number; e: number; text: string }[] = [];
    let removedTotal = 0;
    const operands: Tok[] = [];

    const nextLine = (tx: number, ty: number) => {
        tlm = multiply([1, 0, 0, 1, tx, ty], tlm);
        tm = tlm;
    };

    /** Walks one string, advancing tm. Returns TJ elements with removed glyphs turned into spacing. */
    const showString = (bytes: Uint8Array, font: FontInfo): { parts: (Uint8Array | number)[]; removed: number } => {
        const parts: (Uint8Array | number)[] = [];
        let kept: number[] = [];
        let gap = 0;
        let removed = 0;
        const flushKept = () => {
            if (kept.length) parts.push(Uint8Array.from(kept));
            kept = [];
        };
        const fs = ts.size;
        const th = ts.scale;
        for (let i = 0; i + font.bytes <= bytes.length; i += font.bytes) {
            const code = font.bytes === 2 ? (bytes[i] << 8) | bytes[i + 1] : bytes[i];
            const w0 = font.width(code) / 1000;
            const tx = (w0 * fs + ts.charSpacing + (font.bytes === 1 && code === 32 ? ts.wordSpacing : 0)) * th;
            const trm = multiply(tm, ctm);
            const [cx, cy] = apply(trm, tx / 2, ts.rise + fs * 0.3);
            const glyph = Array.from(bytes.subarray(i, i + font.bytes));
            if (fs !== 0 && th !== 0 && inside(cx, cy)) {
                if (kept.length) {
                    flushKept();
                }
                gap += -(tx / (fs * th)) * 1000;
                removed++;
            } else {
                if (gap !== 0) {
                    parts.push(gap);
                    gap = 0;
                }
                kept.push(...glyph);
            }
            tm = multiply([1, 0, 0, 1, tx, 0], tm);
        }
        flushKept();
        if (gap !== 0) parts.push(gap);
        return { parts, removed };
    };

    const serialize = (parts: (Uint8Array | number)[]) => '[' + parts.map((p) => (typeof p === 'number' ? fmt(p) : hex(p))).join(' ') + '] TJ';

    for (const tok of tokenize(data)) {
        if (tok.t !== 'op') {
            operands.push(tok);
            continue;
        }
        const op = tok.v;
        const nums = () => operands.filter((o): o is Extract<Tok, { t: 'num' }> => o.t === 'num').map((o) => o.v);
        const start = operands.length ? operands[0].s : tok.s;

        switch (op) {
            case 'q':
                stack.push({ ctm, ts: { ...ts } });
                break;
            case 'Q': {
                const top = stack.pop();
                if (top) {
                    ctm = top.ctm;
                    ts = top.ts;
                }
                break;
            }
            case 'cm': {
                const v = nums();
                if (v.length === 6) ctm = multiply(v as Matrix, ctm);
                break;
            }
            case 'BT':
                tm = IDENTITY;
                tlm = IDENTITY;
                break;
            case 'Tf': {
                const name = operands.find((o) => o.t === 'name');
                const v = nums();
                if (name && name.t === 'name') ts.fontName = name.v;
                if (v.length) ts.size = v[v.length - 1];
                break;
            }
            case 'Tc':
                ts.charSpacing = nums()[0] ?? 0;
                break;
            case 'Tw':
                ts.wordSpacing = nums()[0] ?? 0;
                break;
            case 'Tz':
                ts.scale = (nums()[0] ?? 100) / 100;
                break;
            case 'TL':
                ts.leading = nums()[0] ?? 0;
                break;
            case 'Ts':
                ts.rise = nums()[0] ?? 0;
                break;
            case 'Td': {
                const [tx = 0, ty = 0] = nums();
                nextLine(tx, ty);
                break;
            }
            case 'TD': {
                const [tx = 0, ty = 0] = nums();
                ts.leading = -ty;
                nextLine(tx, ty);
                break;
            }
            case 'Tm': {
                const v = nums();
                if (v.length === 6) {
                    tlm = v as Matrix;
                    tm = tlm;
                }
                break;
            }
            case 'T*':
                nextLine(0, -ts.leading);
                break;
            case 'Tj':
            case "'":
            case '"': {
                let prefix = '';
                if (op === '"') {
                    const v = nums();
                    ts.wordSpacing = v[0] ?? ts.wordSpacing;
                    ts.charSpacing = v[1] ?? ts.charSpacing;
                    prefix = `${fmt(ts.wordSpacing)} Tw ${fmt(ts.charSpacing)} Tc T* `;
                    nextLine(0, -ts.leading);
                } else if (op === "'") {
                    prefix = 'T* ';
                    nextLine(0, -ts.leading);
                }
                const str = operands.find((o) => o.t === 'str');
                if (str && str.t === 'str') {
                    const font = await getFont(ts.fontName);
                    const { parts, removed } = showString(str.v, font);
                    if (removed) {
                        removedTotal += removed;
                        edits.push({ s: start, e: tok.e, text: prefix + serialize(parts) });
                    }
                }
                break;
            }
            case 'TJ': {
                const font = await getFont(ts.fontName);
                const out: (Uint8Array | number)[] = [];
                let removedHere = 0;
                for (const o of operands) {
                    if (o.t === 'num') {
                        tm = multiply([1, 0, 0, 1, (-o.v / 1000) * ts.size * ts.scale, 0], tm);
                        out.push(o.v);
                    } else if (o.t === 'str') {
                        const { parts, removed } = showString(o.v, font);
                        removedHere += removed;
                        out.push(...parts);
                    }
                }
                if (removedHere) {
                    removedTotal += removedHere;
                    edits.push({ s: start, e: tok.e, text: serialize(out) });
                }
                break;
            }
            default:
                break;
        }
        operands.length = 0;
    }

    if (!edits.length) return 0;

    // Rebuild the stream: untouched bytes verbatim, edited operators re-serialised.
    const chunks: Uint8Array[] = [];
    let pos = 0;
    const enc = (s: string) => Uint8Array.from(s, (ch) => ch.charCodeAt(0) & 0xff);
    for (const edit of edits) {
        chunks.push(data.subarray(pos, edit.s), enc(edit.text));
        pos = edit.e;
    }
    chunks.push(data.subarray(pos));
    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
        bytes.set(c, offset);
        offset += c.length;
    }

    // Remember the old stream objects so they can be deleted: otherwise the original text would
    // still be stored in the file as an orphaned object.
    const oldRefs: PDFRef[] = [];
    const contents = page.node.get(PDFName.of('Contents'));
    if (contents instanceof PDFRef) {
        const target = doc.context.lookup(contents);
        if (target instanceof PDFArray) {
            oldRefs.push(contents);
            for (let i = 0; i < target.size(); i++) {
                const r = target.get(i);
                if (r instanceof PDFRef) oldRefs.push(r);
            }
        } else oldRefs.push(contents);
    } else if (contents instanceof PDFArray) {
        for (let i = 0; i < contents.size(); i++) {
            const r = contents.get(i);
            if (r instanceof PDFRef) oldRefs.push(r);
        }
    }

    const stream = doc.context.flateStream(bytes);
    const ref = doc.context.register(stream);
    page.node.set(PDFName.of('Contents'), ref);

    const stillUsed = new Set<string>();
    doc.getPages().forEach((p, i) => {
        if (i === pageIndex) return;
        const c = p.node.get(PDFName.of('Contents'));
        const list = c instanceof PDFRef ? doc.context.lookup(c) : c;
        if (c instanceof PDFRef) stillUsed.add(c.toString());
        if (list instanceof PDFArray) for (let k = 0; k < list.size(); k++) stillUsed.add(String(list.get(k)));
    });
    for (const r of oldRefs) if (!stillUsed.has(r.toString())) doc.context.delete(r);
    return removedTotal;
}
