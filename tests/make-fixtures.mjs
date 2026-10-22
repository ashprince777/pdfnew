// Generates the static input files used by the end-to-end tests (into tests/.fixtures).
import fs from 'node:fs';
import path from 'node:path';
import { appRequire as req, FIXTURES } from './env.mjs';
const { PDFDocument, StandardFonts, degrees } = req('@cantoo/pdf-lib');
const docx = req('docx');
const PptxGenJS = req('pptxgenjs');
const XLSX = req('xlsx');
const out = FIXTURES;
const w = (name, data) => fs.writeFileSync(path.join(out, name), data);

async function textPdf(lines, opts = {}) {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  doc.setTitle(opts.title ?? 'Fixture');
  lines.forEach((pageLines, i) => {
    const p = doc.addPage([595, 842]);
    p.drawText(`Page ${i + 1}`, { x: 50, y: 790, size: 24, font: f });
    pageLines.forEach((t, j) => p.drawText(t, { x: 50, y: 740 - j * 20, size: 12, font: f }));
    if (opts.rotateSecond && i === 1) p.setRotation(degrees(90));
  });
  if (opts.form) { const tf = doc.getForm().createTextField('customer.name'); tf.setText('Ada'); tf.addToPage(doc.getPage(0), { x: 50, y: 400, width: 200, height: 24 }); }
  return doc;
}
const base = [
  ['Invoice 1001', 'Item    Qty    Price', 'Apples    3    1,200.50', 'Pears    10    99'],
  ['Second page text', 'Rotated page content'],
  ['Third page', 'The end'],
];
const d1 = await textPdf(base, { rotateSecond: true, form: true, title: 'Original' });
const plain = await d1.save();
w('sample.pdf', plain);
const modified = [base[0].map(l => l.replace('Apples', 'Oranges')), [...base[1], 'An added line'], base[2]];
w('modified.pdf', await (await textPdf(modified, { title: 'Modified' })).save());

const enc = await PDFDocument.load(plain); enc.encrypt({ userPassword: 'secret', ownerPassword: 'owner' }); w('encrypted.pdf', await enc.save());
const res = await PDFDocument.load(plain); res.encrypt({ userPassword: '', ownerPassword: 'owner', permissions: { printing: false, copying: false } }); w('restricted.pdf', await res.save());

// CropBox offset page
const cb = await PDFDocument.create(); const cf = await cb.embedFont(StandardFonts.Helvetica);
const cp = cb.addPage([600, 800]); cp.setMediaBox(0, 0, 600, 800); cp.setCropBox(100, 100, 400, 600); cp.drawText('Cropbox page', { x: 120, y: 650, font: cf, size: 20 });
w('cropbox.pdf', await cb.save());

// Fillable form: text, checkbox, dropdown and radio group
{
  const doc = await PDFDocument.create(); const f = await doc.embedFont(StandardFonts.Helvetica);
  const p = doc.addPage([595, 842]); p.drawText('Application form', { x: 50, y: 780, size: 20, font: f });
  const form = doc.getForm();
  form.createTextField('applicant.full_name').addToPage(p, { x: 50, y: 700, width: 300, height: 24 });
  form.createCheckBox('agree_terms').addToPage(p, { x: 50, y: 650, width: 16, height: 16 });
  const country = form.createDropdown('country'); country.addOptions(['India', 'USA', 'UK']); country.addToPage(p, { x: 50, y: 600, width: 150, height: 24 });
  const plan = form.createRadioGroup('plan'); plan.addOptionToPage('free', p, { x: 50, y: 550, width: 16, height: 16 }); plan.addOptionToPage('premium', p, { x: 100, y: 550, width: 16, height: 16 });
  w('form.pdf', await doc.save());
}

// DOCX with unicode
const wd = new docx.Document({ sections: [{ children: [
  new docx.Paragraph({ children: [new docx.TextRun({ text: 'Quarterly Report — ₹1,500 / €20 / Ελληνικά', bold: true, size: 32 })] }),
  new docx.Paragraph({ children: [new docx.TextRun('Plain paragraph text that is long enough to wrap across the page width when rendered by the converter in the browser.')] }),
  new docx.Table({ rows: [new docx.TableRow({ children: [new docx.TableCell({ children: [new docx.Paragraph('Name')] }), new docx.TableCell({ children: [new docx.Paragraph('Amount')] })] }), new docx.TableRow({ children: [new docx.TableCell({ children: [new docx.Paragraph('Rent')] }), new docx.TableCell({ children: [new docx.Paragraph('₹12,000')] })] })] }),
] }] });
w('report.docx', await docx.Packer.toBuffer(wd));

// PPTX
const pptx = new PptxGenJS();
const s1 = pptx.addSlide(); s1.background = { color: '1E293B' }; s1.addText('Hello Slides ₹ €', { x: 1, y: 1, w: 8, h: 1, fontSize: 36, color: 'FFFFFF', bold: true });
const s2 = pptx.addSlide(); s2.addShape(pptx.ShapeType.rect, { x: 1, y: 1, w: 3, h: 2, fill: { color: 'E11D48' } }); s2.addText('Second slide', { x: 1, y: 3.5, w: 6, h: 1, fontSize: 24 });
w('deck.pptx', Buffer.from(await pptx.write({ outputType: 'arraybuffer' })));

// XLSX
const wb = XLSX.utils.book_new();
const rows = [['Product', 'Description', 'Price (₹)', 'Qty']];
for (let i = 1; i <= 80; i++) rows.push([`Item ${i}`, i % 7 === 0 ? 'A very long description that definitely does not fit in one narrow column and must wrap' : 'Short', i * 10.5, i]);
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Products');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Notes'], ['Ελληνικά and €']]), 'Notes');
w('data.xlsx', XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));

w('page.html', `<!doctype html><html><head><title>HTML Fixture</title><style>body{color:red}</style><script>var secret = "should not appear";</script></head><body>
<h1>Heading One ₹</h1><p>Paragraph with Ελληνικά text and an em dash — here.</p>
<ul><li>First item<ul><li>Nested item</li></ul></li><li>Second item</li></ul>
<pre>const veryLongLine = "${'x'.repeat(150)}";</pre>
<table><tr><th>Column A</th><th>Column B</th></tr><tr><td>${'Long cell text '.repeat(6)}</td><td>Short</td></tr></table>
<script>document.write("nope")</script></body></html>`);
w('not-a-pdf.pdf', 'hello this is not a pdf');
w('legacy.doc', Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]));
// A long Word document without page breaks (Word to PDF pagination).
{
  const para = (i) => new docx.Paragraph({ spacing: { after: 160 }, children: [new docx.TextRun(`Paragraph ${i}. Cell phones are used for several purposes; basically, people make use of cell phone to keep in touch with their family members and friends and for conducting their businesses. Some people have more than one cell phone which are used for different purposes, such as for business and personal use. Hence the growing demand of cell phones has opened a profitable business opportunity for aspiring entrepreneurs all over the globe.`)] });
  const children = [new docx.Paragraph({ heading: docx.HeadingLevel.HEADING_1, children: [new docx.TextRun('A Sample Cell Phone Repair Business Plan Template')] })];
  for (let i = 1; i <= 40; i++) {
    children.push(para(i));
    if (i === 20) children.push(new docx.Table({ rows: Array.from({ length: 12 }, (_, r) => new docx.TableRow({ children: [new docx.TableCell({ children: [new docx.Paragraph(`Row ${r + 1}`)] }), new docx.TableCell({ children: [new docx.Paragraph(`Value ${r * 100}`)] })] })) }));
  }
  w('long.docx', await docx.Packer.toBuffer(new docx.Document({ sections: [{ children }] })));
}

// A tabular doctor list (PDF to Word/Excel tables, Edit PDF).
{
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);
  const p = doc.addPage([595, 842]);
  p.drawText('Cardio Care - Doctor List', { x: 180, y: 790, size: 18, font: b });
  p.drawText('Name', { x: 50, y: 750, size: 11, font: b });
  p.drawText('Speciality', { x: 220, y: 750, size: 11, font: b });
  p.drawText('Phone', { x: 420, y: 750, size: 11, font: b });
  for (let i = 0; i < 25; i++) {
    const y = 728 - i * 22;
    p.drawText(`Dr. Name ${i + 1} & Co <test>`, { x: 50, y, size: 10, font: f });
    p.drawText(i % 2 ? 'Cardiology' : 'Interventional Cardiology', { x: 220, y, size: 10, font: f });
    p.drawText(`+91 98${String(10000000 + i * 7919).slice(0, 8)}`, { x: 420, y, size: 10, font: f });
  }
  p.drawText('Note: Appointments between 9:00 - 17:00 only. Fees include consultation, ECG & follow-up.', { x: 50, y: 150, size: 10, font: f });
  w('doctors.pdf', await doc.save());
}

console.log(`fixtures: ${fs.readdirSync(out).join(' ')}`);
