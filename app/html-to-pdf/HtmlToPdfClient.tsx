"use client";
import { useState } from 'react';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from '@cantoo/pdf-lib';
import { Code, ArrowRight } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, ChoiceGroup, PrimaryAction, Notice, toolStyles } from '@/components/ToolUI';
import { baseName, embedUnicodeFont, PdfToolError, savePdf, toDrawableText, wrapText } from '@/lib/pdf';
import { useToolRunner } from '@/lib/useToolRunner';

type Mode = 'upload' | 'paste';

const PAGE: [number, number] = [595.28, 841.89]; // A4
const MARGIN = 50;
const MAX_WIDTH = PAGE[0] - MARGIN * 2;
const SKIPPED_TAGS = new Set(['script', 'style', 'noscript', 'template', 'svg', 'canvas', 'iframe', 'object', 'head', 'title', 'meta', 'link']);
const HEADINGS: Record<string, { size: number; before: number; after: number }> = {
    h1: { size: 22, before: 10, after: 8 },
    h2: { size: 18, before: 8, after: 6 },
    h3: { size: 14, before: 6, after: 4 },
    h4: { size: 12, before: 4, after: 4 },
    h5: { size: 12, before: 4, after: 4 },
    h6: { size: 12, before: 4, after: 4 },
};

const collapse = (text: string | null | undefined) => (text || '').replace(/\s+/g, ' ').trim();

async function renderHtml(html: string): Promise<PDFDocument> {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const pdfDoc = await PDFDocument.create();
    const font = await embedUnicodeFont(pdfDoc, 'regular');
    const bold = await embedUnicodeFont(pdfDoc, 'bold');
    const mono = await pdfDoc.embedFont(StandardFonts.Courier);
    const title = collapse(doc.title);
    if (title) pdfDoc.setTitle(title);

    let page: PDFPage = pdfDoc.addPage(PAGE);
    let y = PAGE[1] - MARGIN;

    const ensureSpace = (needed: number) => {
        if (y - needed < MARGIN) {
            page = pdfDoc.addPage(PAGE);
            y = PAGE[1] - MARGIN;
        }
    };

    const drawParagraph = (text: string, size: number, f: PDFFont, color: RGB = rgb(0.12, 0.12, 0.12), indent = 0) => {
        const lineHeight = size * 1.4;
        for (const line of wrapText(f, toDrawableText(f, text), size, MAX_WIDTH - indent)) {
            ensureSpace(lineHeight);
            if (line) page.drawText(line, { x: MARGIN + indent, y: y - size, size, font: f, color });
            y -= lineHeight;
        }
    };

    const drawTable = (table: HTMLTableElement) => {
        const rows = Array.from(table.querySelectorAll('tr'))
            .map((tr) => Array.from(tr.querySelectorAll('th, td')).map((cell) => ({ text: collapse(cell.textContent), header: cell.tagName === 'TH' })))
            .filter((cells) => cells.length > 0);
        if (rows.length === 0) return;
        const columns = Math.max(...rows.map((r) => r.length));
        const colWidth = MAX_WIDTH / columns;
        const size = columns > 6 ? 8 : 10;
        const lineHeight = size * 1.3;
        y -= 6;
        for (const cells of rows) {
            const wrapped = cells.map((cell) => {
                const f = cell.header ? bold : font;
                return { f, lines: wrapText(f, toDrawableText(f, cell.text), size, colWidth - 8) };
            });
            const height = Math.max(...wrapped.map((w) => w.lines.length)) * lineHeight + 8;
            ensureSpace(height);
            wrapped.forEach(({ f, lines }, c) => {
                lines.forEach((line, l) => {
                    if (line) page.drawText(line, { x: MARGIN + c * colWidth + 4, y: y - 4 - size - l * lineHeight, size, font: f, color: rgb(0.1, 0.1, 0.1) });
                });
            });
            page.drawRectangle({ x: MARGIN, y: y - height, width: colWidth * columns, height, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5 });
            y -= height;
        }
        y -= 8;
    };

    const drawCode = (text: string) => {
        const size = 9;
        const lineHeight = 12;
        const charWidth = mono.widthOfTextAtSize('M', size);
        const perLine = Math.floor((MAX_WIDTH - 20) / charWidth);
        y -= 4;
        for (const raw of text.replace(/\t/g, '    ').split('\n')) {
            // Courier only covers Latin-1; wrap long lines instead of cutting them off.
            const line = toDrawableText(mono, raw);
            for (let i = 0; i === 0 || i < line.length; i += perLine) {
                ensureSpace(lineHeight);
                const part = line.slice(i, i + perLine);
                page.drawRectangle({ x: MARGIN, y: y - lineHeight + 2, width: MAX_WIDTH, height: lineHeight, color: rgb(0.96, 0.96, 0.97) });
                if (part) page.drawText(part, { x: MARGIN + 10, y: y - size, size, font: mono, color: rgb(0.2, 0.2, 0.4) });
                y -= lineHeight;
            }
        }
        y -= 6;
    };

    const walk = (node: Node, listDepth = 0) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = collapse(node.textContent);
            if (text) {
                drawParagraph(text, 11, font);
                y -= 4;
            }
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (SKIPPED_TAGS.has(tag)) return;

        if (HEADINGS[tag]) {
            const h = HEADINGS[tag];
            const text = collapse(el.textContent);
            if (text) {
                y -= h.before;
                drawParagraph(text, h.size, bold, rgb(0.05, 0.05, 0.05));
                y -= h.after;
            }
        } else if (tag === 'p' || tag === 'blockquote') {
            const text = collapse(el.textContent);
            if (text) {
                drawParagraph(text, 11, font, tag === 'blockquote' ? rgb(0.35, 0.35, 0.4) : undefined, tag === 'blockquote' ? 16 : 0);
                y -= 6;
            }
        } else if (tag === 'li') {
            const ordered = el.parentElement?.tagName === 'OL';
            const index = Array.from(el.parentElement?.children || []).indexOf(el) + 1;
            const nested = Array.from(el.children).filter((c) => c.tagName === 'UL' || c.tagName === 'OL');
            const ownText = collapse(Array.from(el.childNodes).filter((c) => !nested.includes(c as Element)).map((c) => c.textContent).join(' '));
            if (ownText) drawParagraph(`${ordered ? `${index}.` : '•'}  ${ownText}`, 11, font, undefined, 12 + listDepth * 14);
            y -= 2;
            nested.forEach((list) => Array.from(list.childNodes).forEach((child) => walk(child, listDepth + 1)));
        } else if (tag === 'ul' || tag === 'ol') {
            Array.from(el.childNodes).forEach((child) => walk(child, listDepth));
            y -= 4;
        } else if (tag === 'pre') {
            drawCode(el.textContent || '');
        } else if (tag === 'table') {
            drawTable(el as HTMLTableElement);
        } else if (tag === 'hr') {
            ensureSpace(15);
            y -= 6;
            page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE[0] - MARGIN, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
            y -= 10;
        } else if (tag === 'br') {
            y -= 8;
        } else {
            Array.from(el.childNodes).forEach((child) => walk(child, listDepth));
        }
    };

    if (doc.body) Array.from(doc.body.childNodes).forEach((child) => walk(child));
    return pdfDoc;
}

export default function HtmlToPdfClient() {
    const [mode, setMode] = useState<Mode>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [htmlText, setHtmlText] = useState('');
    const tool = useToolRunner();

    const convert = () => {
        tool.run(async () => {
            const html = mode === 'upload' ? await file?.text() : htmlText;
            if (!html?.trim()) throw new PdfToolError(mode === 'upload' ? 'Please choose an HTML file.' : 'Please enter or paste HTML code.');
            const pdfDoc = await renderHtml(html);
            const filename = mode === 'upload' && file ? `${baseName(file.name)}.pdf` : 'pasted_html.pdf';
            return { blob: await savePdf(pdfDoc), filename };
        }, 'Error converting HTML to PDF. Please ensure the HTML is valid.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
        setHtmlText('');
    };

    return (
        <div className="container">
            <ToolHeader title="HTML to PDF" subtitle="Convert HTML files or pasted HTML code into a clean, text-searchable PDF document." />

            {tool.status === 'IDLE' && (
                <ToolWorkspace>
                    <ChoiceGroup
                        label="Input"
                        value={mode}
                        onChange={setMode}
                        options={[
                            { value: 'upload', title: 'Upload HTML file' },
                            { value: 'paste', title: 'Paste HTML code' },
                        ]}
                    />

                    {mode === 'upload' && !file && <FileUploader onFilesSelected={(files) => setFile(files[0] ?? null)} accept=".html,.htm" />}
                    {mode === 'upload' && file && <SelectedFile file={file} onRemove={() => setFile(null)} icon={Code} />}

                    {mode === 'paste' && (
                        <OptionsCard title="HTML content">
                            <textarea
                                value={htmlText}
                                onChange={(e) => setHtmlText(e.target.value)}
                                placeholder="<h1>My Document</h1><p>Paste your HTML markup here...</p>"
                                rows={10}
                                aria-label="HTML content"
                                className={toolStyles.input}
                                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 14 }}
                            />
                        </OptionsCard>
                    )}

                    <Notice>
                        Headings, paragraphs, lists, tables, quotes and code blocks are converted to real, selectable text.
                        Stylesheets, scripts and external images are not loaded.
                    </Notice>

                    {(mode === 'paste' || file) && (
                        <PrimaryAction onClick={convert} disabled={mode === 'paste' && !htmlText.trim()}>
                            Convert to PDF <ArrowRight size={22} />
                        </PrimaryAction>
                    )}
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status="Converting HTML to PDF..." />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="Your PDF is ready!"
                />
            )}
        </div>
    );
}
