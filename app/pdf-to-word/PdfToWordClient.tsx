"use client";
import { useState } from 'react';
import { FileText, ArrowRight } from 'lucide-react';
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ImageRun,
    AlignmentType,
    PageBreak,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
} from 'docx';
import JSZip from 'jszip';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, ChoiceGroup, PrimaryAction, Notice } from '@/components/ToolUI';
import { baseName } from '@/lib/pdf';
import { canvasToBlob, openPdfjsDocument, releaseCanvas, renderPageToCanvas } from '@/lib/pdfjs';
import { getPositionedText, groupIntoRows, rowText, splitIntoCells, type TextRow } from '@/lib/textLayout';
import { useToolRunner } from '@/lib/useToolRunner';

type Mode = 'editable' | 'layout';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const A4_TWIPS = { width: 11906, height: 16838 };
const MARGIN_TWIPS = 720;
const USABLE_WIDTH_TWIPS = A4_TWIPS.width - 2 * MARGIN_TWIPS;

/** Column widths (twips) proportional to where each column starts on the PDF page. */
function columnWidthsTwips(starts: number[], pageWidth: number): number[] {
    const spans = starts.map((x, k) => Math.max(20, (k + 1 < starts.length ? starts[k + 1] : pageWidth - Math.min(starts[0], 72)) - x));
    const total = spans.reduce((sum, w) => sum + w, 0);
    const widths = spans.map((w) => Math.floor((w / total) * USABLE_WIDTH_TWIPS));
    widths[widths.length - 1] += USABLE_WIDTH_TWIPS - widths.reduce((sum, w) => sum + w, 0);
    return widths;
}

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

/** Removes characters that are illegal in XML 1.0 (Word refuses to open such files). */
const sanitizeText = (str: string) => str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F]/g, '');

interface Line {
    text: string;
    x: number;
    right: number;
    y: number;
    size: number;
    bold: boolean;
    italic: boolean;
    cells: { x: number; text: string }[] | null;
}

function toLine(row: TextRow): Line {
    const first = row.items[0];
    const last = row.items[row.items.length - 1];
    const size = Math.max(...row.items.map((i) => i.height));
    const cells = splitIntoCells(row.items);
    const wideGaps = cells.length >= 2 && cells.length <= 6 && cells.some((c, i) => i > 0 && c.x - cells[i - 1].x > 80);
    return {
        text: sanitizeText(rowText(row.items)),
        x: first.x,
        right: last.x + last.width,
        y: row.y,
        size,
        bold: /bold|black|heavy|semibold/i.test(first.fontName),
        italic: /italic|oblique/i.test(first.fontName),
        cells: wideGaps ? cells.map((c) => ({ ...c, text: sanitizeText(c.text) })) : null,
    };
}

/** Rebuilds paragraphs: consecutive lines with the same indent, size and normal spacing are joined. */
function buildPageContent(rows: TextRow[], pageWidth: number): (Paragraph | Table)[] {
    const lines = rows.map(toLine).filter((l) => l.text);
    const out: (Paragraph | Table)[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const halfPts = Math.round(Math.min(48, Math.max(8, line.size)) * 2);

        if (line.cells) {
            // Consecutive lines with the same column layout become one table.
            const rowsOfTable: Line[] = [line];
            while (i + rowsOfTable.length < lines.length) {
                const next = lines[i + rowsOfTable.length];
                if (!next.cells || next.cells.length !== line.cells.length) break;
                rowsOfTable.push(next);
            }
            const widths = columnWidthsTwips(line.cells.map((c) => c.x), pageWidth);
            out.push(
                new Table({
                    // Fixed twip (DXA) widths: percentage widths are written as "100%", which
                    // Word 2007 cannot open ("problems with the contents").
                    width: { size: USABLE_WIDTH_TWIPS, type: WidthType.DXA },
                    columnWidths: widths,
                    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
                    rows: rowsOfTable.map(
                        (row) =>
                            new TableRow({
                                children: row.cells!.map(
                                    (cell, c) =>
                                        new TableCell({
                                            width: { size: widths[c], type: WidthType.DXA },
                                            borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
                                            children: [
                                                new Paragraph({
                                                    children: [new TextRun({ text: cell.text, size: Math.round(Math.min(48, Math.max(8, row.size)) * 2), bold: row.bold, font: 'Calibri' })],
                                                }),
                                            ],
                                        })
                                ),
                            })
                    ),
                })
            );
            i += rowsOfTable.length;
            continue;
        }

        // Join wrapped lines of the same paragraph.
        let text = line.text;
        let j = i + 1;
        while (j < lines.length) {
            const prev = lines[j - 1];
            const next = lines[j];
            const sameStyle = !next.cells && Math.abs(next.size - line.size) < 0.6 && next.bold === line.bold;
            const sameIndent = Math.abs(next.x - line.x) < 4;
            const normalSpacing = next.y - prev.y < line.size * 1.75;
            const prevFilled = prev.right > pageWidth * 0.6; // a short previous line ends the paragraph
            if (!(sameStyle && sameIndent && normalSpacing && prevFilled)) break;
            text = text.endsWith('-') ? text.slice(0, -1) + next.text : `${text} ${next.text}`;
            j++;
        }

        const center = (line.x + line.right) / 2;
        const isCentered = j === i + 1 && Math.abs(center - pageWidth / 2) < 30 && line.x > 72;
        const indentTwips = isCentered ? 0 : Math.round(Math.max(0, line.x - 50) * 20);
        const gapAfter = j < lines.length ? lines[j].y - lines[j - 1].y - line.size : 0;

        out.push(
            new Paragraph({
                children: [new TextRun({ text, size: halfPts, bold: line.bold || line.size >= 15, italics: line.italic, font: 'Calibri' })],
                alignment: isCentered ? AlignmentType.CENTER : AlignmentType.LEFT,
                indent: indentTwips > 200 ? { left: Math.min(indentTwips, 4000) } : undefined,
                spacing: { after: Math.round(Math.min(Math.max(gapAfter, 2), 24) * 20) },
            })
        );
        i = j;
    }
    return out;
}

/** Makes the docx package output open in every Word version (2007+). */
async function fixDocxForWord(raw: ArrayBuffer): Promise<Blob> {
    const zip = await JSZip.loadAsync(raw);
    let xml = (await zip.file('word/document.xml')?.async('text')) || '';
    let docPr = 1;
    // Unique ids, and only the attributes Word 2007 knows (`title` was added in Word 2010).
    xml = xml.replace(/<wp:docPr\b[^>]*?(\/?)>/g, (_match, selfClosing: string) => {
        const id = docPr++;
        return `<wp:docPr id="${id}" name="Picture ${id}"${selfClosing}>`;
    });
    let cNv = 1;
    xml = xml.replace(/<pic:cNvPr\s+id="[^"]*"/g, () => `<pic:cNvPr id="${cNv++}"`);
    zip.file('word/document.xml', sanitizeText(xml));
    // <w:compatSetting> is a Word 2010 element in the main namespace; Word 2007 refuses files containing it.
    const settings = await zip.file('word/settings.xml')?.async('text');
    if (settings) zip.file('word/settings.xml', settings.replace(/<w:compat>[\s\S]*?<\/w:compat>/, ''));
    return zip.generateAsync({ type: 'blob', mimeType: DOCX_MIME });
}

export default function PdfToWordClient() {
    const [file, setFile] = useState<File | null>(null);
    const [mode, setMode] = useState<Mode>('editable');
    const tool = useToolRunner();

    const convertToWord = () => {
        if (!file) return;
        tool.run(async () => {
            const pdfDoc = await openPdfjsDocument(await file.arrayBuffer());
            const children: (Paragraph | Table)[] = [];
            const usableWidthPt = (A4_TWIPS.width - 2 * MARGIN_TWIPS) / 20;
            const usableHeightPt = (A4_TWIPS.height - 2 * MARGIN_TWIPS) / 20;
            let foundText = false;

            for (let i = 1; i <= pdfDoc.numPages; i++) {
                tool.setProgress(`Processing page ${i} of ${pdfDoc.numPages}...`);
                const page = await pdfDoc.getPage(i);

                if (mode === 'layout') {
                    const canvas = await renderPageToCanvas(page, 2);
                    const jpeg = new Uint8Array(await (await canvasToBlob(canvas, 'image/jpeg', 0.88)).arrayBuffer());
                    releaseCanvas(canvas);
                    const { width, height } = page.getViewport({ scale: 1 });
                    const scale = Math.min(usableWidthPt / width, usableHeightPt / height);
                    // ImageRun sizes are in pixels at 96 DPI.
                    children.push(
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new ImageRun({ type: 'jpg', data: jpeg, transformation: { width: Math.round(width * scale * 1.333), height: Math.round(height * scale * 1.333) } })],
                        })
                    );
                } else {
                    const { items, width } = await getPositionedText(page);
                    if (items.length) foundText = true;
                    children.push(...buildPageContent(groupIntoRows(items), width));
                }
                page.cleanup();
                if (i < pdfDoc.numPages) children.push(new Paragraph({ children: [new PageBreak()] }));
            }
            await pdfDoc.destroy();

            if (mode === 'editable' && !foundText) {
                children.unshift(
                    new Paragraph({ children: [new TextRun({ text: 'No selectable text was found in this PDF. It may be a scanned document. Try the "Exact layout" option instead.', italics: true })] })
                );
            }

            tool.setProgress('Building Word document...');
            const doc = new Document({
                sections: [
                    {
                        properties: { page: { size: A4_TWIPS, margin: { top: MARGIN_TWIPS, bottom: MARGIN_TWIPS, left: MARGIN_TWIPS, right: MARGIN_TWIPS } } },
                        children,
                    },
                ],
            });
            const blob = await fixDocxForWord(await Packer.toArrayBuffer(doc));
            return { blob, filename: `${baseName(file.name)}.docx` };
        }, 'Error generating the Word document. Please try again.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
    };

    return (
        <div className="container">
            <ToolHeader title="PDF to Word" subtitle="Convert your PDF into an editable Word document (DOCX)." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={(files) => setFile(files[0] ?? null)} accept=".pdf" />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace>
                    <SelectedFile file={file} onRemove={reset} icon={FileText} />
                    <OptionsCard title="Conversion mode">
                        <ChoiceGroup
                            label="Conversion mode"
                            value={mode}
                            onChange={setMode}
                            options={[
                                { value: 'editable', title: 'Editable text', text: 'Paragraphs and simple tables you can edit' },
                                { value: 'layout', title: 'Exact layout', text: 'Pages as images, looks identical' },
                            ]}
                        />
                    </OptionsCard>
                    <Notice>
                        {mode === 'editable'
                            ? 'Text, headings and simple tables are rebuilt as editable Word content. Images and complex layouts are not carried over.'
                            : 'Each page is placed as a picture so it looks exactly like the PDF, but the text cannot be edited.'}
                    </Notice>
                    <PrimaryAction onClick={convertToWord}>
                        Convert to Word <ArrowRight size={22} />
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status={tool.progress || 'Converting PDF to Word...'} />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="Your Word document is ready!"
                />
            )}
        </div>
    );
}
