// Unit test for lib/textRemoval.ts. Run: node --experimental-strip-types tests/text-removal.test.mts
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts, PDFName, PDFRawStream, decodePDFRawStream } from '@cantoo/pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { removeTextInBoxes } from '../lib/textRemoval.ts';

/** Unkerned width (pdf-lib's widthOfTextAtSize applies kerning, but drawText does not). */
const plainWidth = (font: { widthOfTextAtSize: (t: string, s: number) => number }, text: string, size: number) =>
    [...text].reduce((sum, ch) => sum + font.widthOfTextAtSize(ch, size), 0);

async function textOf(bytes: Uint8Array) {
    const doc = await getDocument({ data: bytes.slice(), useSystemFonts: false, disableFontFace: true }).promise;
    const out: { str: string; x: number; y: number }[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
        const c = await (await doc.getPage(p)).getTextContent();
        for (const it of c.items as { str: string; transform: number[] }[]) if (it.str.trim()) out.push({ str: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) });
    }
    return out;
}

/** Concatenated, decoded raw bytes of every stream in the file (to prove nothing is left behind). */
function allStreamText(doc: PDFDocument) {
    let s = '';
    for (const [, obj] of doc.context.enumerateIndirectObjects()) {
        if (obj instanceof PDFRawStream) {
            try {
                s += Buffer.from(decodePDFRawStream(obj).decode()).toString('latin1');
            } catch {
                /* binary */
            }
        }
    }
    return s;
}

// --- 1. Standard font (no /Widths), separate Tj ops and a TJ line ----------------------------
{
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([595, 842]);
    page.drawText('Invoice total: 4500', { x: 60, y: 760, size: 20, font });
    page.drawText('Keep this line', { x: 60, y: 700, size: 14, font });
    page.drawText('Phone 9876543210 call now', { x: 60, y: 650, size: 14, font });
    const saved = await PDFDocument.load(await doc.save());

    const total = plainWidth(font, 'Invoice total: ', 20);
    const amountW = plainWidth(font, '4500', 20);
    // Box around "4500" only.
    const removedA = await removeTextInBoxes(saved, 0, [{ x0: 60 + total - 1, y0: 755, x1: 60 + total + amountW + 1, y1: 785 }]);
    assert.equal(removedA, 4, 'removes the 4 digits');
    // Box around the phone number (middle of a run).
    const before = plainWidth(font, 'Phone ', 14);
    const phoneW = plainWidth(font, '9876543210', 14);
    const removedB = await removeTextInBoxes(saved, 0, [{ x0: 60 + before - 0.5, y0: 645, x1: 60 + before + phoneW + 0.5, y1: 665 }]);
    assert.equal(removedB, 10, 'removes the 10 phone digits');

    const bytes = await saved.save();
    const items = await textOf(bytes);
    const all = items.map((i) => i.str).join(' | ');
    assert.ok(!all.includes('4500'), 'amount gone from text layer: ' + all);
    assert.ok(!all.includes('9876543210'), 'phone gone from text layer: ' + all);
    assert.ok(all.includes('Invoice total:'), 'label kept');
    assert.ok(all.includes('Keep this line'), 'other line kept');
    assert.ok(/call now/.test(all), 'text after the phone kept');
    // "call now" must stay exactly where it was.
    const call = items.find((i) => i.str.includes('call now'));
    const expectedX = Math.round(60 + plainWidth(font, 'Phone 9876543210 ', 14));
    if (call && !call.str.startsWith('Phone')) assert.ok(Math.abs(call.x - expectedX) <= 1, `"call now" stays in place (${call.x} vs ${expectedX})`);
    const reloaded = await PDFDocument.load(bytes);
    const raw = allStreamText(reloaded);
    assert.ok(!raw.includes('4500') && !raw.includes('9876543210'), 'no stream in the file still holds the removed text');
    console.log('ok 1 - standard font: removed text, kept neighbours, no orphaned copy');
}

// --- 2. Embedded (Type0/CID) fonts are covered by the browser test "edit text twice" in tests/editor.e2e.mjs,
//        because fontkit runs out of memory when laying out text under Node.

// --- 3. Nothing inside the box leaves the page untouched ------------------------------------
{
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    doc.addPage([300, 300]).drawText('Hello', { x: 20, y: 200, size: 12, font });
    const saved = await PDFDocument.load(await doc.save());
    const contentsBefore = saved.getPage(0).node.get(PDFName.of('Contents'))?.toString();
    assert.equal(await removeTextInBoxes(saved, 0, [{ x0: 200, y0: 10, x1: 250, y1: 40 }]), 0);
    assert.equal(saved.getPage(0).node.get(PDFName.of('Contents'))?.toString(), contentsBefore, 'contents untouched');
    console.log('ok 3 - no-op when the box is empty');
}

console.log('all text-removal tests passed');
