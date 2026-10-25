// End-to-end checks for every tool page, verifying the produced files.
// Run against a running app: BASE_URL=http://localhost:3210 node tests/tools.e2e.mjs [name filter]
import fs from 'node:fs';
import path from 'node:path';
import { appRequire as req, BASE_URL as BASE, FIXTURES as FX, OUTPUT as OUT, launchBrowser, pdfjs } from './env.mjs';

const { PDFDocument, PDFName } = req('@cantoo/pdf-lib');
const JSZip = req('jszip');
const XLSX = req('xlsx');
const fx = (n) => path.join(FX, n);
const filter = process.argv[2];

const browser = await launchBrowser();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
context.setDefaultTimeout(60000);

const results = [];
const RESULTS_FILE = filter ? `results-${filter.replace(/[^a-z0-9]+/gi, "_")}.json` : "results.json";
let currentErrors = [];
async function newPage() {
    const page = await context.newPage();
    page.on('console', (m) => m.type() === 'error' && currentErrors.push(`console: ${m.text().slice(0, 300)}`));
    page.on('pageerror', (e) => currentErrors.push(`pageerror: ${e.message.slice(0, 300)}`));
    return page;
}

async function test(name, fn) {
    if (filter && !name.toLowerCase().includes(filter.toLowerCase())) return;
    currentErrors = [];
    const page = await newPage();
    const started = Date.now();
    try {
        const note = await fn(page);
        const errs = currentErrors.filter((e) => !/favicon|Download the React DevTools|\[Fast Refresh\]|hydrat/i.test(e));
        results.push({ name, ok: true, note: note || '', errs, ms: Date.now() - started });
    } catch (e) {
        await page.screenshot({ path: path.join(OUT, `${name.replace(/\W+/g, '_')}.png`), fullPage: true }).catch(() => {});
        results.push({ name, ok: false, note: e.message.split('\n')[0].slice(0, 400), errs: currentErrors, ms: Date.now() - started });
    } finally {
        await page.close();
    }
    const r = results[results.length - 1];
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${name} (${(r.ms / 1000).toFixed(1)}s)  ${r.note}${r.errs.length ? `\n      errors: ${r.errs.join(' | ')}` : ''}`);
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

async function open(page, route) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
}
async function upload(page, files, index = 0) {
    await page.locator('input[type=file]').nth(index).setInputFiles(Array.isArray(files) ? files : [files]);
}
const click = (page, name) => page.getByRole('button', { name }).first().click();

/** Waits for the result link and returns its bytes. */
async function result(page, timeout = 120000) {
    const link = page.locator('a[download]').first();
    await link.waitFor({ timeout });
    const filename = await link.getAttribute('download');
    const b64 = await link.evaluate(async (a) => {
        const buf = await (await fetch(a.href)).arrayBuffer();
        let s = '';
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return btoa(s);
    });
    const bytes = Buffer.from(b64, 'base64');
    fs.writeFileSync(path.join(OUT, filename), bytes);
    const heading = await page.locator('h2').first().textContent();
    return { bytes: new Uint8Array(bytes), filename, heading };
}

async function toast(page) {
    const t = page.locator('[role=alert]', { hasText: /[a-z]/i }).first();
    await t.waitFor({ timeout: 30000 });
    return (await t.textContent()).trim();
}

async function pdfInfo(bytes, password) {
    const doc = await pdfjs.getDocument({ data: bytes.slice(), password }).promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
        const p = await doc.getPage(i);
        const vp = p.getViewport({ scale: 1 });
        const tc = await p.getTextContent();
        const items = tc.items.filter((it) => it.str.trim()).map((it) => {
            const m = pdfjs.Util.transform(vp.transform, it.transform);
            return { str: it.str, x: m[4], y: m[5] };
        });
        pages.push({ rotate: p.rotate, width: vp.width, height: vp.height, text: items.map((i) => i.str).join(' '), items });
    }
    return { numPages: doc.numPages, pages };
}

// ---------------------------------------------------------------------------
// Extra fixtures made in the browser (JPEGs)
{
    const page = await newPage();
    await page.goto(BASE + '/about');
    const make = (w, h, q) =>
        page.evaluate(
            async ([w, h, q]) => {
                const c = document.createElement('canvas');
                c.width = w;
                c.height = h;
                const ctx = c.getContext('2d');
                const img = ctx.createImageData(w, h);
                for (let i = 0; i < img.data.length; i += 4) {
                    const x = (i / 4) % w, y = Math.floor(i / 4 / w);
                    img.data[i] = (x * 255) / w + Math.random() * 60;
                    img.data[i + 1] = (y * 255) / h + Math.random() * 60;
                    img.data[i + 2] = 128 + Math.random() * 90;
                    img.data[i + 3] = 255;
                }
                ctx.putImageData(img, 0, 0);
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, w / 4, h / 8); // marks the top-left corner
                const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', q));
                return Array.from(new Uint8Array(await blob.arrayBuffer()));
            },
            [w, h, q]
        );
    const photo = Uint8Array.from(await make(2400, 1800, 0.95));
    const doc = await PDFDocument.create();
    const font = await doc.embedFont('Helvetica');
    const img = await doc.embedJpg(photo);
    for (let i = 0; i < 2; i++) {
        const p = doc.addPage([595, 842]);
        p.drawImage(img, { x: 50, y: 300, width: 495, height: 371 });
        p.drawText(`Photo page ${i + 1} searchable`, { x: 50, y: 760, size: 20, font });
    }
    fs.writeFileSync(fx('photo.pdf'), await doc.save());

    // 400x200 JPEG + EXIF orientation 6 (rotate 90° CW to display) => displayed 200x400 portrait
    const jpg = Uint8Array.from(await make(400, 200, 0.9));
    const exif = Buffer.from([
        0xff, 0xe1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
        0x00, 0x01, 0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    fs.writeFileSync(fx('rotated-photo.jpg'), Buffer.concat([Buffer.from(jpg.subarray(0, 2)), exif, Buffer.from(jpg.subarray(2))]));
    fs.writeFileSync(fx('plain.jpg'), jpg);

    // Corrupted PDF: break the cross-reference data
    const sample = fs.readFileSync(fx('sample.pdf'));
    const s = sample.toString('latin1');
    const idx = s.lastIndexOf('startxref');
    fs.writeFileSync(fx('corrupt.pdf'), Buffer.from(s.slice(0, idx) + 'startxref\n999999\n%%EOF', 'latin1'));
    await page.close();
}

// ---------------------------------------------------------------------------
await test('merge', async (page) => {
    await open(page, '/merge-pdf');
    await upload(page, [fx('sample.pdf'), fx('modified.pdf')]);
    await page.getByText('6 pages').waitFor();
    await page.getByRole('button', { name: 'Move modified.pdf up' }).click();
    const workers = [];
    page.on('worker', (worker) => workers.push(worker.url()));
    await click(page, /^Merge PDF/);
    const { bytes } = await result(page);
    const info = await pdfInfo(bytes);
    assert(info.numPages === 6, `expected 6 pages, got ${info.numPages}`);
    assert(info.pages[0].text.includes('Oranges'), 'reordered: modified.pdf should come first');
    assert(info.pages[3].text.includes('Apples'), 'sample.pdf should be second');
    // pdf.js has its own worker; ours is the bundled chunk that runs pdf-lib off the main thread.
    assert(workers.some((url) => !url.includes('pdf.worker.min')), `merge should run in a background worker (saw: ${workers.join(', ') || 'none'})`);
    return '6 pages, custom order respected, ran in a Web Worker';
});

await test('merge rejects encrypted input', async (page) => {
    await open(page, '/merge-pdf');
    await upload(page, [fx('sample.pdf'), fx('encrypted.pdf')]);
    await page.getByText('Password-protected: unlock it first').waitFor();
    assert(await page.getByRole('button', { name: /^Merge PDF/ }).isDisabled(), 'merge button should be disabled');
    return 'flagged encrypted file before merging';
});

await test('split every page', async (page) => {
    await open(page, '/split-pdf');
    await upload(page, fx('sample.pdf'));
    await page.getByText('3 pages').waitFor();
    await click(page, /^Split PDF/);
    const { bytes } = await result(page);
    const zip = await JSZip.loadAsync(bytes);
    const names = Object.keys(zip.files);
    assert(names.length === 3, `expected 3 files, got ${names.join(',')}`);
    return names.join(', ');
});

await test('split ranges + invalid range', async (page) => {
    await open(page, '/split-pdf');
    await upload(page, fx('sample.pdf'));
    await page.getByRole('radio', { name: /Split by ranges/ }).click();
    await page.locator('#split-ranges').fill('1-2, 9');
    await click(page, /^Split PDF/);
    const msg = await toast(page);
    assert(/Invalid page range: "9"/.test(msg), `unexpected toast: ${msg}`);
    await page.locator('#split-ranges').fill('3-2, 1');
    await click(page, /^Split PDF/);
    const { bytes } = await result(page);
    const zip = await JSZip.loadAsync(bytes);
    const files = Object.keys(zip.files);
    const first = await pdfInfo(await zip.file(files[0]).async('uint8array'));
    assert(files.length === 2 && first.numPages === 2 && first.pages[0].text.includes('Page 3'), `ranges wrong: ${files} / ${first.pages[0]?.text}`);
    return `toast "${msg}"; reverse range 3-2 kept order`;
});

await test('remove pages keeps forms + metadata', async (page) => {
    await open(page, '/remove-pages');
    await upload(page, fx('sample.pdf'));
    await page.getByRole('button', { name: 'Page 2', exact: true }).click();
    await click(page, /Remove 1 Page/);
    const { bytes } = await result(page);
    const info = await pdfInfo(bytes);
    const doc = await PDFDocument.load(bytes);
    assert(info.numPages === 2 && !info.pages.some((p) => p.text.includes('Second page')), 'page 2 not removed');
    assert(doc.getTitle() === 'Original', `title lost: ${doc.getTitle()}`);
    assert(doc.getForm().getFields().length === 1, 'form field lost');
    return 'page removed; title + form field preserved';
});

await test('organize reorder + rotate', async (page) => {
    await open(page, '/organize-pdf');
    await upload(page, fx('sample.pdf'));
    await page.getByRole('button', { name: 'Move page 3 earlier' }).click();
    await page.getByRole('button', { name: 'Move page 3 earlier' }).click();
    await page.getByRole('button', { name: 'Rotate page 1 right' }).click();
    await click(page, /Save Organized PDF/);
    const { bytes } = await result(page);
    const info = await pdfInfo(bytes);
    assert(info.pages.map((p) => p.text.match(/Page (\d)/)?.[1]).join('') === '312', `order ${info.pages.map((p) => p.text.slice(0, 7))}`);
    assert(info.pages[1].rotate === 90, `page 1 rotation ${info.pages[1].rotate}`);
    return 'order 3,1,2; rotation applied';
});

await test('rotate all right', async (page) => {
    await open(page, '/rotate-pdf');
    await upload(page, fx('sample.pdf'));
    await click(page, 'Rotate all right');
    await click(page, /Save PDF/);
    const { bytes } = await result(page);
    const info = await pdfInfo(bytes);
    assert(info.pages.map((p) => p.rotate).join(',') === '90,180,90', `rotations ${info.pages.map((p) => p.rotate)}`);
    return 'rotations 90,180,90';
});

await test('compress keeps text and shrinks', async (page) => {
    await open(page, '/compress-pdf');
    await upload(page, fx('photo.pdf'));
    await click(page, /Compress PDF/);
    const { bytes, heading } = await result(page);
    const orig = fs.statSync(fx('photo.pdf')).size;
    const info = await pdfInfo(bytes);
    assert(bytes.length < orig * 0.8, `not smaller: ${orig} -> ${bytes.length}`);
    assert(info.pages[0].text.includes('searchable'), 'text lost');
    return `${heading}`;
});

await test('compress extreme', async (page) => {
    await open(page, '/compress-pdf');
    await upload(page, fx('photo.pdf'));
    await page.getByRole('radio', { name: /Extreme/ }).click();
    await click(page, /Compress PDF/);
    const { bytes, heading } = await result(page);
    assert(bytes.length < fs.statSync(fx('photo.pdf')).size, 'not smaller');
    return heading;
});

await test('compress pdf to 200kb page fits the limit', async (page) => {
    await open(page, '/compress-pdf-to-200kb');
    await page.getByRole('heading', { name: 'Compress PDF to 200 KB' }).waitFor();
    await upload(page, fx('photo.pdf'));
    assert(await page.getByRole('radio', { name: /Fit to a size/ }).getAttribute('aria-checked') === 'true', 'size mode not preselected');
    assert((await page.locator('#target-kb').inputValue()) === '200', 'limit not preset to 200');
    await click(page, /Compress PDF/);
    const { bytes } = await result(page, 240000);
    const original = fs.statSync(fx('photo.pdf')).size;
    assert(bytes.length <= 200 * 1024, `result ${bytes.length} bytes is over 200 KB`);
    const info = await pdfInfo(bytes);
    assert(info.numPages > 0, 'result has no pages');
    return `${Math.round(original / 1024)} KB -> ${Math.round(bytes.length / 1024)} KB (limit 200 KB)`;
});

await test('compress to custom size and seo pages render', async (page) => {
    await open(page, '/compress-pdf');
    await upload(page, fx('photo.pdf'));
    await page.getByRole('radio', { name: /Fit to a size/ }).click();
    await page.locator('#target-kb').fill('500');
    await click(page, /Compress PDF/);
    const { bytes } = await result(page, 240000);
    assert(bytes.length <= 500 * 1024, `result ${bytes.length} bytes is over 500 KB`);
    for (const route of ['/compress-pdf-to-20kb', '/compress-pdf-to-50kb', '/compress-pdf-to-100kb', '/compress-pdf-to-300kb', '/compress-pdf-to-500kb', '/compress-pdf-to-1mb', '/compress-pdf-to-2mb', '/blog', '/blog/aadhaar-pan-itr-pdf-password']) {
        const res = await page.goto(BASE + route);
        assert(res.status() === 200, `${route} returned ${res.status()}`);
    }
    await page.getByRole('heading', { level: 1, name: /Aadhaar, PAN, ITR/ }).waitFor();
    assert(await page.getByText('SURE1990').first().isVisible(), 'Aadhaar password example missing');
    const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
    assert(sitemap.includes('/compress-pdf-to-200kb') && sitemap.includes('/blog/how-to-merge-pdf-files'), 'new pages missing from sitemap');
    const adminRes = await page.goto(`${BASE}/admin`);
    assert(adminRes.status() === 404, `/admin should be hidden, got ${adminRes.status()}`);
    return `${Math.round(bytes.length / 1024)} KB under a 500 KB limit; size pages + blog + sitemap OK; /admin hidden`;
});

await test('compress text-only keeps original', async (page) => {
    await open(page, '/compress-pdf');
    await upload(page, fx('sample.pdf'));
    await click(page, /Compress PDF/);
    const { bytes, heading } = await result(page);
    assert(bytes.length <= fs.statSync(fx('sample.pdf')).size, 'grew');
    return heading;
});

await test('repair corrupt xref', async (page) => {
    await open(page, '/repair-pdf');
    await upload(page, fx('corrupt.pdf'));
    await click(page, /Repair PDF/);
    const { bytes, heading } = await result(page);
    const info = await pdfInfo(bytes);
    assert(info.numPages === 3 && info.pages[0].text.includes('Invoice'), 'not repaired');
    return heading;
});

await test('jpg to pdf honours EXIF', async (page) => {
    await open(page, '/jpg-to-pdf');
    await upload(page, [fx('rotated-photo.jpg'), fx('plain.jpg')]);
    await click(page, /Convert to PDF/);
    const { bytes } = await result(page);
    const info = await pdfInfo(bytes);
    assert(info.numPages === 2, 'expected 2 pages');
    assert(info.pages[0].height > info.pages[0].width, `EXIF-rotated image should give portrait page, got ${info.pages[0].width}x${info.pages[0].height}`);
    assert(info.pages[1].width > info.pages[1].height, 'plain landscape image should give landscape page');
    return `A4 portrait for EXIF-6 photo (${Math.round(info.pages[0].width)}x${Math.round(info.pages[0].height)})`;
});

await test('pdf to jpg', async (page) => {
    await open(page, '/pdf-to-jpg');
    await upload(page, fx('sample.pdf'));
    await click(page, /Convert to JPG/);
    const { bytes } = await result(page);
    const zip = await JSZip.loadAsync(bytes);
    const files = Object.keys(zip.files);
    assert(files.length === 3 && files.every((f) => f.endsWith('.jpg')), files.join());
    return files.join(', ');
});

await test('pdf to png page defaults to png', async (page) => {
    await open(page, '/pdf-to-png');
    await page.getByRole('heading', { level: 1, name: 'PDF to PNG' }).waitFor();
    await upload(page, fx('sample.pdf'));
    await click(page, /Convert to PNG/);
    const { bytes } = await result(page);
    const files = Object.keys((await JSZip.loadAsync(bytes)).files);
    assert(files.length === 3 && files.every((f) => f.endsWith('.png')), files.join());
    return files.join(', ');
});

await test('png and webp to pdf pages', async (page) => {
    for (const [route, heading] of [['/png-to-pdf', 'PNG to PDF'], ['/webp-to-pdf', 'WebP to PDF']]) {
        await open(page, route);
        await page.getByRole('heading', { level: 1, name: heading }).waitFor();
    }
    await upload(page, fx('logo.png'));
    await click(page, /Convert to PDF/);
    const info = await pdfInfo((await result(page)).bytes);
    assert(info.numPages === 1, `expected 1 page, got ${info.numPages}`);
    const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
    for (const route of ['/png-to-pdf', '/webp-to-pdf', '/pdf-to-png', '/pdf-to-text', '/compress-pdf-to-300kb', '/compress-pdf-to-2mb']) {
        assert(sitemap.includes(route), `${route} missing from sitemap`);
    }
    return 'headings, PNG conversion and sitemap OK';
});

await test('pdf to text (text layer and OCR)', async (page) => {
    await open(page, '/pdf-to-text');
    await upload(page, fx('sample.pdf'));
    await click(page, /Extract text/);
    const { bytes, filename } = await result(page);
    const text = Buffer.from(bytes).toString('utf8');
    assert(filename.endsWith('.txt') && text.includes('--- Page 3 ---') && text.includes('Page 3'), `text wrong: ${text.slice(0, 120)}`);

    // The scanned fixture is made by the editor suite; skip OCR if it has not run yet.
    if (!fs.existsSync(fx('doctors-scan.pdf'))) return `${text.length} chars from text layer; OCR skipped (no scanned fixture)`;
    await open(page, '/pdf-to-text');
    await upload(page, fx('doctors-scan.pdf'));
    await click(page, /Extract text/);
    const scanned = Buffer.from((await result(page, 180000)).bytes).toString('utf8');
    assert(scanned.trim().split(/\s+/).length > 10, `OCR found too little text: ${scanned.slice(0, 120)}`);
    return `${text.length} chars from text layer; ${scanned.length} chars via OCR`;
});

await test('page numbers on rotated page', async (page) => {
    await open(page, '/add-page-numbers');
    await upload(page, fx('sample.pdf'));
    await click(page, /Add Page Numbers/);
    const { bytes } = await result(page);
    const info = await pdfInfo(bytes);
    for (const [i, p] of info.pages.entries()) {
        const item = p.items.find((it) => it.str.includes(`Page ${i + 1} of 3`));
        assert(item, `missing number on page ${i + 1}`);
        assert(item.y > p.height * 0.9, `page ${i + 1}: number not at bottom (y=${item.y.toFixed(0)}/${p.height})`);
        assert(Math.abs(item.x + 30 - p.width / 2) < 60, `page ${i + 1}: not centered (x=${item.x.toFixed(0)}/${p.width})`);
    }
    return 'bottom-centre on all pages incl. rotated page 2';
});

await test('watermark unicode', async (page) => {
    await open(page, '/watermark-pdf');
    await upload(page, fx('sample.pdf'));
    await page.locator('#wm-text').fill('DRAFT ₹ Ελληνικά 😀');
    await click(page, /Apply Watermark/);
    const { bytes } = await result(page);
    const info = await pdfInfo(bytes);
    assert(info.pages.every((p) => p.text.includes('DRAFT ₹ Ελληνικά')), `watermark text: ${info.pages[0].text}`);
    return 'unicode watermark on all pages (emoji replaced)';
});

async function imagePaintsPerPage(bytes) {
    const d = await pdfjs.getDocument({ data: bytes.slice() }).promise;
    const counts = [];
    for (let i = 1; i <= d.numPages; i++) {
        const ops = await (await d.getPage(i)).getOperatorList();
        counts.push(ops.fnArray.filter((f) => f === pdfjs.OPS.paintImageXObject).length);
    }
    return counts;
}

async function makeLogoPng(page) {
    await page.goto(BASE + '/about');
    const png = await page.evaluate(async () => {
        const c = document.createElement('canvas');
        c.width = 300;
        c.height = 150;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#1d4ed8';
        ctx.beginPath();
        ctx.arc(75, 75, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = 'bold 48px sans-serif';
        ctx.fillText('LOGO', 145, 92);
        const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
        return Array.from(new Uint8Array(await blob.arrayBuffer()));
    });
    fs.writeFileSync(fx('logo.png'), Buffer.from(png));
}

await test('watermark image centred', async (page) => {
    await makeLogoPng(page);
    await open(page, '/watermark-pdf');
    await upload(page, fx('sample.pdf'));
    await page.getByRole('radio', { name: /^Image/ }).click();
    await page.getByLabel('Watermark image').setInputFiles(fx('logo.png'));
    await click(page, /Apply Watermark/);
    const { bytes } = await result(page);
    const counts = await imagePaintsPerPage(bytes);
    assert(counts.every((c) => c === 1), `image draws per page: ${counts}`);
    const doc = await PDFDocument.load(bytes);
    const refs = doc.getPages().map((p) => p.node.Resources().lookup(PDFName.of('XObject')).values()[0].toString());
    assert(new Set(refs).size === 1, `image embedded more than once: ${refs}`);
    assert(Buffer.from(bytes).toString('latin1').includes('/ca 0.3'), 'opacity missing');
    fs.writeFileSync(path.join(OUT, 'watermark-image.pdf'), bytes);
    return `1 image per page on ${counts.length} pages, one shared embedded copy, 30% opacity`;
});

await test('watermark image tiled', async (page) => {
    await open(page, '/watermark-pdf');
    await upload(page, fx('sample.pdf'));
    await page.getByRole('radio', { name: /^Image/ }).click();
    await page.getByLabel('Watermark image').setInputFiles(fx('logo.png'));
    await page.getByRole('radio', { name: /^Tiled/ }).click();
    await click(page, /Apply Watermark/);
    const { bytes } = await result(page);
    const counts = await imagePaintsPerPage(bytes);
    assert(counts.every((c) => c >= 6), `tiles per page: ${counts}`);
    return `tiles per page: ${counts.join(', ')}`;
});

await test('crop with preview', async (page) => {
    await open(page, '/crop-pdf');
    await upload(page, fx('sample.pdf'));
    await page.locator('#crop-top').fill('100');
    await click(page, /^Crop PDF/);
    const { bytes } = await result(page);
    const doc = await PDFDocument.load(bytes);
    const p1 = doc.getPage(0).getCropBox();
    assert(Math.round(p1.height) === 842 - 136 && Math.round(p1.y) === 36, `page1 cropbox ${JSON.stringify(p1)}`);
    // page 2 is rotated 90: the visual top is the PDF right edge
    const p2 = doc.getPage(1).getCropBox();
    // /Rotate 90 turns the PDF's left edge into the visual top, so the 100pt "top" margin lands on x.
    assert(Math.round(p2.x) === 100 && Math.round(p2.y) === 36 && Math.round(p2.width) === 595 - 136 && Math.round(p2.height) === 842 - 72, `rotated cropbox ${JSON.stringify(p2)}`);
    return 'margins applied relative to how pages are displayed';
});

await test('edit: text + highlight', async (page) => {
    await page.setViewportSize({ width: 1280, height: 2200 });
    await open(page, '/edit-pdf');
    await upload(page, fx('sample.pdf'));
    const img = page.locator('img[alt="Page 1"]');
    await img.waitFor();
    await img.scrollIntoViewIfNeeded();
    const box = await img.boundingBox();
    // Text tool: clicking an empty spot starts new text at that point.
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
    const input = page.getByLabel('New text');
    await input.fill('Sample Text');
    await input.press('Enter');
    await page.getByRole('button', { name: 'Highlight' }).click();
    await page.mouse.move(box.x + box.width * 0.08, box.y + box.height * 0.11);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.13, { steps: 5 });
    await page.mouse.up();
    await click(page, /Apply changes/);
    const { bytes } = await result(page);
    const info = await pdfInfo(bytes);
    const t = info.pages[0].items.find((i) => i.str === 'Sample Text');
    assert(t, 'text missing');
    assert(Math.abs(t.x - 297.5) < 4 && Math.abs(t.y - 421) < 4, `text at x=${t.x} y=${t.y}`);
    const raw = Buffer.from(bytes).toString('latin1');
    assert(raw.includes('/BM /Multiply'), 'highlight blend mode missing');
    return `new text baseline at the click point (x=${t.x.toFixed(1)}, y=${t.y.toFixed(1)}); highlight multiplied`;
});

await test('sign typed', async (page) => {
    await open(page, '/sign-pdf');
    await upload(page, fx('sample.pdf'));
    await page.getByRole('radio', { name: 'Type' }).click();
    await page.getByLabel('Your name').fill('Ada Lovelace');
    await click(page, /Sign & Download/);
    const { bytes } = await result(page);
    const doc = await PDFDocument.load(bytes);
    const res = doc.getPage(2).node.Resources();
    const xobj = res.lookup(PDFName.of('XObject'));
    assert(xobj && xobj.keys().length > 0, 'no signature image on last page');
    return 'signature image placed on last page';
});

await test('sign with uploaded photo of signature', async (page) => {
    // Make a JPEG "photo" of a blue signature on slightly grey, noisy paper.
    await page.goto(BASE + '/about');
    const jpg = await page.evaluate(async () => {
        const c = document.createElement('canvas');
        c.width = 600;
        c.height = 240;
        const ctx = c.getContext('2d');
        const img = ctx.createImageData(600, 240);
        for (let i = 0; i < img.data.length; i += 4) {
            const v = 238 + Math.random() * 14;
            img.data[i] = v;
            img.data[i + 1] = v;
            img.data[i + 2] = v - 4;
            img.data[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
        ctx.strokeStyle = '#1a2fb0';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(60, 170);
        ctx.bezierCurveTo(140, 20, 220, 220, 300, 90);
        ctx.bezierCurveTo(360, 10, 420, 200, 540, 80);
        ctx.stroke();
        const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
        return Array.from(new Uint8Array(await blob.arrayBuffer()));
    });
    fs.writeFileSync(fx('signature-photo.jpg'), Buffer.from(jpg));

    await open(page, '/sign-pdf');
    await upload(page, fx('sample.pdf'));
    await page.getByRole('radio', { name: 'Upload' }).click();
    await page.locator('input[aria-label="Signature image"]').setInputFiles(fx('signature-photo.jpg'));
    await page.getByAltText('Uploaded signature').waitFor();
    await click(page, /Sign & Download/);
    const { bytes } = await result(page);
    const doc = await PDFDocument.load(bytes);
    const xobjects = doc.getPage(2).node.Resources().lookup(PDFName.of('XObject'));
    assert(xobjects && xobjects.keys().length > 0, 'no signature image on last page');
    const image = doc.context.lookup(xobjects.get(xobjects.keys()[0]));
    assert(image.dict.has(PDFName.of('SMask')), 'signature image has no transparency (paper not removed)');
    const w = image.dict.get(PDFName.of('Width')).asNumber();
    const h = image.dict.get(PDFName.of('Height')).asNumber();
    assert(w < 600 && h < 240, `signature not trimmed to the ink: ${w}x${h}`);
    return `placed transparent ${w}x${h} signature (trimmed from 600x240 photo)`;
});

await test('protect (AES-256)', async (page) => {
    await open(page, '/protect-pdf');
    await upload(page, fx('sample.pdf'));
    await page.locator('#protect-password').fill('pa55');
    await page.locator('#protect-confirm').fill('pa55');
    await click(page, /Protect PDF/);
    const { bytes } = await result(page);
    let needsPwd = false;
    try {
        await pdfInfo(bytes);
    } catch (e) {
        needsPwd = e.name === 'PasswordException';
    }
    assert(needsPwd, 'output opens without password');
    const info = await pdfInfo(bytes, 'pa55');
    assert(info.pages[0].text.includes('Invoice 1001'), 'text lost');
    const raw = Buffer.from(bytes).toString('latin1');
    assert(/\/V 5/.test(raw) && /\/R 6/.test(raw), 'not AES-256 (V5/R6)');
    return 'requires password; AES-256; text intact';
});

await test('unlock with password', async (page) => {
    await open(page, '/unlock-pdf');
    await upload(page, fx('encrypted.pdf'));
    await page.locator('#unlock-password').fill('wrong');
    await click(page, /Unlock PDF/);
    const msg = await toast(page);
    assert(/Incorrect password/.test(msg), msg);
    await page.locator('#unlock-password').fill('secret');
    await click(page, /Unlock PDF/);
    const { bytes } = await result(page);
    const info = await pdfInfo(bytes);
    const doc = await PDFDocument.load(bytes);
    assert(!doc.isEncrypted && info.pages[0].text.includes('Invoice 1001'), 'not decrypted');
    assert(doc.getForm().getFields().length === 1, 'form lost');
    return `wrong pwd toast: "${msg}"; text + form preserved`;
});

await test('unlock restrictions-only + not encrypted', async (page) => {
    await open(page, '/unlock-pdf');
    await upload(page, fx('restricted.pdf'));
    await click(page, /Unlock PDF/);
    const { bytes } = await result(page);
    assert(!(await PDFDocument.load(bytes)).isEncrypted, 'still encrypted');
    await click(page, /Process another file/);
    await upload(page, fx('sample.pdf'));
    await click(page, /Unlock PDF/);
    const msg = await toast(page);
    assert(/not password-protected/.test(msg), msg);
    return 'restrictions removed; plain PDF explained';
});

await test('encrypted input to edit tool', async (page) => {
    await open(page, '/rotate-pdf');
    await upload(page, fx('encrypted.pdf'));
    const msg = await toast(page);
    assert(/Unlock PDF tool/.test(msg), msg);
    return msg;
});

await test('non-pdf input', async (page) => {
    await open(page, '/rotate-pdf');
    await upload(page, fx('not-a-pdf.pdf'));
    const msg = await toast(page);
    assert(/not a valid PDF/.test(msg), msg);
    return msg;
});

await test('pdf to pdf/a', async (page) => {
    await open(page, '/pdf-to-pdfa');
    await upload(page, fx('sample.pdf'));
    await click(page, /Convert to PDF\/A/);
    const { bytes, heading } = await result(page);
    const doc = await PDFDocument.load(bytes);
    assert(doc.catalog.has(PDFName.of('OutputIntents')), 'no OutputIntents');
    assert(Buffer.from(bytes).toString('latin1').includes('pdfaid') || doc.catalog.has(PDFName.of('Metadata')), 'no XMP');
    const warn = await page.locator('[role=note]').first().textContent();
    return `${heading}; warning: ${warn.slice(0, 80)}`;
});

await test('pdf to word', async (page) => {
    await open(page, '/pdf-to-word');
    await upload(page, fx('sample.pdf'));
    await click(page, /Convert to Word/);
    const { bytes } = await result(page);
    const xml = await (await JSZip.loadAsync(bytes)).file('word/document.xml').async('text');
    assert(xml.includes('Invoice 1001') && !xml.includes('Editable Content') && !xml.includes('<pic:pic'), 'docx content wrong');
    return 'editable text, no duplicate page images';
});

await test('pdf to powerpoint', async (page) => {
    await open(page, '/pdf-to-powerpoint');
    await upload(page, fx('sample.pdf'));
    await click(page, /Convert to PowerPoint/);
    const { bytes } = await result(page);
    const zip = await JSZip.loadAsync(bytes);
    const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    const pres = await zip.file('ppt/presentation.xml').async('text');
    const [, cx, cy] = pres.match(/sldSz cx="(\d+)" cy="(\d+)"/) || [];
    assert(slides.length === 3, `slides ${slides.length}`);
    assert(Math.abs(cy / cx - 842 / 595) < 0.01, `slide ratio ${cy / cx}`);
    return `3 slides, portrait slide size ${cx}x${cy}`;
});

await test('pdf to excel', async (page) => {
    await open(page, '/pdf-to-excel');
    await upload(page, fx('sample.pdf'));
    await click(page, /Convert to Excel/);
    const { bytes } = await result(page);
    const wb = XLSX.read(bytes);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Page 1'], { header: 1 });
    const apples = rows.find((r) => r.includes('Apples'));
    assert(apples && apples.includes(1200.5) && apples.includes(3), `row: ${JSON.stringify(apples)} / ${JSON.stringify(rows)}`);
    return `row ${JSON.stringify(apples)}`;
});

await test('word to pdf', async (page) => {
    await open(page, '/word-to-pdf');
    await upload(page, fx('report.docx'));
    await click(page, /Convert to PDF/);
    const { bytes } = await result(page);
    const info = await pdfInfo(bytes);
    const hasText = info.pages.some((p) => p.text.includes('Quarterly'));
    return `${info.numPages} page(s); ${hasText ? 'XML FALLBACK used (text layer)' : 'high-fidelity render used (image)'}`;
});

await test('word to pdf long document paginates', async (page) => {
    await open(page, '/word-to-pdf');
    await upload(page, fx('long.docx'));
    await click(page, /Convert to PDF/);
    const { bytes } = await result(page);
    const info = await pdfInfo(bytes);
    assert(info.numPages >= 7, `expected >= 7 pages, got ${info.numPages}`);
    assert(info.pages.every((p) => p.height < 900), `a page is taller than A4/Letter: ${info.pages.map((p) => Math.round(p.height))}`);
    return `${info.numPages} pages of ${Math.round(info.pages[0].width)}x${Math.round(info.pages[0].height)}pt`;
});

await test('word legacy .doc', async (page) => {
    await open(page, '/word-to-pdf');
    await upload(page, fx('legacy.doc'));
    await click(page, /Convert to PDF/);
    const msg = await toast(page);
    assert(/97-2003/.test(msg), msg);
    return msg;
});

await test('powerpoint to pdf', async (page) => {
    await open(page, '/powerpoint-to-pdf');
    await upload(page, fx('deck.pptx'));
    await click(page, /Convert to PDF/);
    const { bytes } = await result(page);
    const info = await pdfInfo(bytes);
    assert(info.numPages === 2, `pages ${info.numPages}`);
    return `${info.numPages} slides rendered`;
});

await test('excel to pdf', async (page) => {
    await open(page, '/excel-to-pdf');
    await upload(page, fx('data.xlsx'));
    await click(page, /Convert to PDF/);
    const { bytes } = await result(page);
    const info = await pdfInfo(bytes);
    const all = info.pages.map((p) => p.text).join(' ');
    assert(all.includes('₹') && all.includes('Ελληνικά'), 'unicode lost');
    assert(all.includes('must wrap'), 'long cell truncated');
    return `${info.numPages} pages; unicode + wrapped cells present`;
});

await test('html to pdf', async (page) => {
    await open(page, '/html-to-pdf');
    await upload(page, fx('page.html'));
    await click(page, /Convert to PDF/);
    const { bytes } = await result(page);
    const info = await pdfInfo(bytes);
    const all = info.pages.map((p) => p.text).join(' ');
    assert(all.includes('Heading One ₹') && all.includes('Ελληνικά'), 'unicode missing');
    assert(!all.includes('should not appear') && !all.includes('color:red') && !all.includes('nope'), 'script/style text leaked');
    assert((all.match(/Long cell text/g) || []).length === 6, 'table cell truncated');
    assert(all.replace(/\s/g, '').includes('x'.repeat(150)), 'code line truncated');
    return 'unicode ok, scripts skipped, nothing truncated';
});

await test('compare', async (page) => {
    await open(page, '/compare-pdf');
    await upload(page, fx('sample.pdf'), 0);
    await page.getByText('sample.pdf').waitFor();
    await upload(page, fx('modified.pdf'), 0);
    await click(page, /Compare Documents/);
    const summaryLocator = page.locator('p', { hasText: /[+][0-9]+ added/ }).first();
    await summaryLocator.waitFor();
    const summary = await summaryLocator.textContent();
    assert(/\+2 added/.test(summary) && /1 removed/.test(summary), summary);
    const dl = page.waitForEvent('download');
    await click(page, /Download report PDF/);
    const download = await dl;
    const rp = path.join(OUT, 'report.pdf');
    await download.saveAs(rp);
    const info = await pdfInfo(new Uint8Array(fs.readFileSync(rp)));
    assert(info.pages[0].text.includes('Oranges'), 'report missing changes');
    return summary.replace(/\s+/g, ' ');
});

// Static pages
for (const route of ['/', '/all-tools', '/faq', '/about', '/privacy', '/terms', '/contact', '/deletion-policy', '/sitemap.xml', '/robots.txt', '/opengraph-image']) {
    await test(`page ${route}`, async (page) => {
        const res = await page.goto(BASE + route, { waitUntil: 'networkidle' });
        assert(res.status() === 200, `status ${res.status()}`);
        return `${res.status()} ${await page.title()}`;
    });
}

await test('redact: search + drawn box, true removal', async (page) => {
    await open(page, '/redact-pdf');
    await upload(page, fx('sample.pdf'));
    await page.locator('#redact-query').fill('apples');
    await click(page, /Mark all/);
    await page.getByText(/Marked 1 match on 1 page/).waitFor();
    // Draw a second box by hand near the top of page 1.
    const overlay = page.locator('[aria-label^="Page preview. Drag"]');
    await page.getByRole('img', { name: 'Page 1' }).waitFor();
    const box = await overlay.boundingBox();
    await page.mouse.move(box.x + box.width * 0.05, box.y + box.height * 0.04);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.08, { steps: 5 });
    await page.mouse.up();
    assert((await page.getByTestId('redact-box').count()) === 2, 'expected 2 redaction boxes');
    await click(page, /^Redact PDF/);
    const { bytes } = await result(page);
    const info = await pdfInfo(bytes);
    assert(info.numPages === 3, `expected 3 pages, got ${info.numPages}`);
    assert(!info.pages[0].text.includes('Apples') && !info.pages[0].text.includes('Invoice'), `page 1 still has extractable text: ${info.pages[0].text}`);
    assert(info.pages[1].text.includes('Second page text') && info.pages[1].rotate === 90, 'page 2 should be untouched');
    const doc = await PDFDocument.load(bytes);
    assert(!doc.getTitle(), `title should be removed, got ${doc.getTitle()}`);
    assert(doc.getForm().getFields().length === 0, 'form field on the redacted page should be removed');
    // The blacked-out area really is black in the page image.
    const pdfPage = await (await pdfjs.getDocument({ data: bytes.slice() }).promise).getPage(1);
    const ops = await pdfPage.getOperatorList();
    assert(ops.fnArray.includes(pdfjs.OPS.paintImageXObject), 'redacted page should be an image');
    return 'page 1 rasterised (no text), page 2 kept, title + form field removed';
});

await test('fill form fields (unicode)', async (page) => {
    await open(page, '/fill-pdf-form');
    await upload(page, fx('form.pdf'));
    await page.getByText('4 fillable fields').waitFor();
    await page.getByLabel('Full name').fill('Ravi Kumar ₹');
    await page.getByLabel('Agree terms').check();
    await page.getByLabel('Country').selectOption('USA');
    await page.getByLabel('premium').check();
    await click(page, /Fill PDF form/);
    const { bytes } = await result(page);
    const form = (await PDFDocument.load(bytes)).getForm();
    assert(form.getTextField('applicant.full_name').getText() === 'Ravi Kumar ₹', 'name not filled');
    assert(form.getCheckBox('agree_terms').isChecked(), 'checkbox not ticked');
    assert(form.getDropdown('country').getSelected()[0] === 'USA', 'dropdown not set');
    assert(form.getRadioGroup('plan').getSelected() === 'premium', 'radio not set');
    return 'text (with ₹), checkbox, dropdown and radio saved';
});

await test('fill form flattened + no-fields notice', async (page) => {
    await open(page, '/fill-pdf-form');
    await upload(page, fx('form.pdf'));
    await page.getByLabel('Full name').fill('Ravi Kumar');
    await page.getByLabel(/Flatten the form/).check();
    await click(page, /Fill PDF form/);
    const { bytes } = await result(page);
    assert((await PDFDocument.load(bytes)).getForm().getFields().length === 0, 'flattened form should have no fields');
    const info = await pdfInfo(bytes);
    assert(info.pages[0].text.includes('Ravi Kumar'), `flattened text missing: ${info.pages[0].text}`);
    await open(page, '/fill-pdf-form');
    await upload(page, fx('modified.pdf'));
    await page.getByText(/has no fillable form fields/).waitFor();
    return 'answers flattened into page; plain PDF shows Edit PDF hint';
});

await test('scan to pdf with camera + image', async (page) => {
    await open(page, '/scan-to-pdf');
    await click(page, /Open camera/);
    await page.waitForFunction(() => document.querySelector('[data-testid=scan-video]')?.videoWidth > 0);
    await click(page, /Capture page/);
    await page.getByTestId('scan-page').first().waitFor();
    await click(page, /Capture page/);
    await page.getByTestId('scan-page').nth(1).waitFor();
    await click(page, /^Done$/);
    await page.getByTestId('scan-upload').setInputFiles(fx('plain.jpg'));
    await page.getByTestId('scan-page').nth(2).waitFor();
    await click(page, 'Rotate page 3');
    await click(page, /Create PDF/);
    const { bytes } = await result(page);
    const info = await pdfInfo(bytes);
    assert(info.numPages === 3, `expected 3 pages, got ${info.numPages}`);
    const [a, , c] = info.pages;
    assert(Math.round(Math.max(a.width, a.height)) === 842 && Math.round(Math.min(a.width, a.height)) === 595, `camera page should be A4, got ${a.width}x${a.height}`);
    assert(c.height > c.width, 'rotated landscape photo should give a portrait page');
    return `2 camera captures + 1 photo, A4 (${Math.round(a.width)}x${Math.round(a.height)})`;
});

await test('ai tools show coming soon without setup', async (page) => {
    for (const route of ['/summarize-pdf', '/chat-with-pdf', '/translate-pdf']) {
        await open(page, route);
        await page.getByText(/AI features are coming soon/).waitFor({ timeout: 10000 });
    }
    return 'all three AI pages degrade gracefully';
});

await test('tailwind utilities + dark mode', async (page) => {
    await open(page, '/faq');
    const pad = await page.evaluate(() => getComputedStyle(document.querySelector('.py-12')).paddingTop);
    assert(pad === '48px', `py-12 padding is ${pad}`);
    await page.evaluate(() => localStorage.setItem('pdf_theme', 'dark'));
    await page.reload();
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    assert(theme === 'dark', `theme ${theme}`);
    return 'py-12 => 48px; dark theme applied before hydration';
});

await test('no third-party requests while processing', async (page) => {
    const external = [];
    page.on('request', (r) => {
        const u = new URL(r.url());
        if (!['localhost', '127.0.0.1'].includes(u.hostname) && !u.protocol.startsWith('blob') && !u.protocol.startsWith('data')) external.push(u.href);
    });
    await open(page, '/protect-pdf');
    await upload(page, fx('sample.pdf'));
    await page.locator('#protect-password').fill('abcd');
    await page.locator('#protect-confirm').fill('abcd');
    await click(page, /Protect PDF/);
    await result(page);
    await open(page, '/pdf-to-jpg');
    await upload(page, fx('sample.pdf'));
    await click(page, /Convert to JPG/);
    await result(page);
    assert(external.length === 0, `external requests: ${external.join(', ')}`);
    return 'no external hosts contacted (pdf.js worker served locally)';
});

await browser.close();
const failed = results.filter((r) => !r.ok);
const withErrors = results.filter((r) => r.ok && r.errs.length);
console.log(`\n${results.length - failed.length}/${results.length} passed${withErrors.length ? `, ${withErrors.length} with console errors` : ''}`);
fs.writeFileSync(path.join(OUT, RESULTS_FILE), JSON.stringify(results, null, 2));
process.exitCode = failed.length ? 1 : 0;
