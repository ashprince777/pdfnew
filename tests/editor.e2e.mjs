// Browser tests for the Sejda-style Edit PDF tool: inline text edit, OCR edit, image replace.
// Run after tests/tools.e2e.mjs (it creates photo.pdf and plain.jpg).
import fs from 'node:fs';
import { appRequire as req, BASE_URL as BASE, FIXTURES, OUTPUT, launchBrowser, pdfjs } from './env.mjs';

const { PDFDocument, PDFName } = req('@cantoo/pdf-lib');
const only = process.argv[2];
const b = await launchBrowser();
let failures = 0;

async function textOf(bytes) {
    const d = await pdfjs.getDocument({ data: bytes.slice() }).promise;
    const p = await d.getPage(1);
    return (await p.getTextContent()).items.map((i) => i.str).join(' | ');
}
async function grab(p) {
    const link = p.locator('a[download]').first();
    await link.waitFor({ timeout: 120000 });
    const b64 = await link.evaluate(async (a) => {
        const u = new Uint8Array(await (await fetch(a.href)).arrayBuffer());
        let s = '';
        for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
        return btoa(s);
    });
    return new Uint8Array(Buffer.from(b64, 'base64'));
}
async function run(name, fn) {
    if (only && !name.includes(only)) return;
    const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
    const errors = [];
    const external = [];
    p.on('request', (r) => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol) && !['localhost', '127.0.0.1'].includes(u.hostname)) external.push(u.href); });
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
    try {
        const note = await fn(p);
        if (external.length) throw new Error('external requests: ' + external.join(', '));
        console.log(`PASS  ${name}: ${note} (no external requests)`);
    } catch (e) {
        await p.screenshot({ path: `${OUTPUT}/editor-${name.replace(/\W+/g, '_')}.png`, fullPage: true });
        failures++;
        console.log(`FAIL  ${name}: ${e.message.split('\n')[0]}`);
    }
    if (errors.length) console.log('   errors:', errors.join(' | ').slice(0, 400));
    await p.close();
}

await run('edit existing text', async (p) => {
    await p.goto(`${BASE}/edit-pdf`, { waitUntil: 'networkidle' });
    await p.locator('input[type=file]').first().setInputFiles(`${FIXTURES}/doctors.pdf`);
    const seg = p.getByRole('button', { name: 'Edit text: Dr. Name 3 & Co <test>' });
    await seg.waitFor({ timeout: 60000 });
    await seg.click();
    const input = p.getByLabel('Edit text', { exact: true });
    await input.waitFor();
    await input.fill('Dr. Ashwin Prakash');
    await p.getByRole('button', { name: 'Bold' }).click();
    await p.screenshot({ path: `${OUTPUT}/editor-inline.png`, clip: { x: 0, y: 450, width: 1280, height: 520 } });
    await input.press('Enter');
    await p.getByRole('button', { name: /Apply changes/ }).click();
    const bytes = await grab(p);
    fs.writeFileSync(`${OUTPUT}/edited-text.pdf`, bytes);
    const text = await textOf(bytes);
    if (!text.includes('Dr. Ashwin Prakash')) throw new Error('new text missing: ' + text.slice(0, 200));
    return 'replacement text written; screenshot editor-inline.png';
});

/** Builds an image-only ("scanned") copy of doctors.pdf using the app's PDF to JPG tool. */
async function makeScannedFixture() {
    const target = `${FIXTURES}/doctors-scan.pdf`;
    if (fs.existsSync(target)) return;
    const p = await b.newPage();
    await p.goto(`${BASE}/pdf-to-jpg`, { waitUntil: 'networkidle' });
    await p.locator('input[type=file]').first().setInputFiles(`${FIXTURES}/doctors.pdf`);
    await p.getByRole('button', { name: /Convert to JPG/ }).click();
    const jpg = await grab(p);
    await p.close();
    const doc = await PDFDocument.create();
    const img = await doc.embedJpg(jpg);
    doc.addPage([595, 842]).drawImage(img, { x: 0, y: 0, width: 595, height: 842 });
    fs.writeFileSync(target, await doc.save());
}

await run('ocr scanned page', async (p) => {
    await makeScannedFixture();
    await p.goto(`${BASE}/edit-pdf`, { waitUntil: 'networkidle' });
    await p.locator('input[type=file]').first().setInputFiles(`${FIXTURES}/doctors-scan.pdf`);
    await p.getByRole('button', { name: 'Detect text with OCR' }).click();
    const seg = p.getByRole('button', { name: /Edit text: .*Cardiology/ }).first();
    await seg.waitFor({ timeout: 180000 });
    const count = await p.getByRole('button', { name: /^Edit text: / }).count();
    const label = await seg.getAttribute('aria-label');
    await seg.click();
    const input = p.getByLabel('Edit text', { exact: true });
    await input.fill('Neurology Department');
    await input.press('Enter');
    await p.getByRole('button', { name: /Apply changes/ }).click();
    const bytes = await grab(p);
    fs.writeFileSync(`${OUTPUT}/edited-scan.pdf`, bytes);
    const text = await textOf(bytes);
    if (!text.includes('Neurology Department')) throw new Error('new text missing');
    return `${count} OCR segments; edited "${label.replace('Edit text: ', '')}"`;
});

await run('replace image', async (p) => {
    await p.goto(`${BASE}/edit-pdf`, { waitUntil: 'networkidle' });
    await p.locator('input[type=file]').first().setInputFiles(`${FIXTURES}/photo.pdf`);
    await p.getByRole('button', { name: 'Images' }).click();
    const target = p.getByRole('button', { name: 'Replace this image' }).first();
    await target.waitFor({ timeout: 60000 });
    const chooser = p.waitForEvent('filechooser');
    await target.click();
    await (await chooser).setFiles(`${FIXTURES}/plain.jpg`);
    await p.getByAltText('Replacement').first().waitFor();
    await p.getByRole('button', { name: /Apply changes/ }).click();
    const bytes = await grab(p);
    const doc = await PDFDocument.load(bytes);
    const xo = doc.getPage(0).node.Resources().lookup(PDFName.of('XObject'));
    const img = doc.context.lookup(xo.get(xo.keys()[0]));
    const w = img.dict.get(PDFName.of('Width')).asNumber();
    const h = img.dict.get(PDFName.of('Height')).asNumber();
    const p2 = doc.context.lookup(doc.getPage(1).node.Resources().lookup(PDFName.of('XObject')).values()[0]);
    const p2w = p2.dict.get(PDFName.of('Width')).asNumber();
    // page 1 now uses a new image (with the original 4:3 box proportions); page 2 still has the 2400x1800 photo
    if (p2w !== 2400) throw new Error('page 2 image changed');
    if (w === 2400) throw new Error('page 1 image not replaced');
    if (Math.abs(w / h - 495 / 371) > 0.02) throw new Error(`aspect not preserved ${w}x${h}`);
    return `page 1 image ${w}x${h} (box aspect kept), page 2 untouched`;
});

await b.close();
process.exitCode = failures ? 1 : 0;
