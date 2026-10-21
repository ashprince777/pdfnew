"use client";
import { useState } from 'react';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from '@cantoo/pdf-lib';
import { FileSpreadsheet, ArrowRight } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, ChoiceGroup, PrimaryAction, Notice } from '@/components/ToolUI';
import { baseName, embedUnicodeFont, PdfToolError, savePdf, toDrawableText, wrapText } from '@/lib/pdf';
import { useToolRunner } from '@/lib/useToolRunner';

type Orientation = 'landscape' | 'portrait';

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 36;
const FONT_SIZE = 9;
const LINE_HEIGHT = FONT_SIZE * 1.3;
const CELL_PAD = 4;
const MIN_COL = 40;

/** Distributes the printable width across columns in proportion to their content length. */
function columnWidths(rows: string[][], columns: number, available: number): number[] {
    const lengths = Array.from({ length: columns }, (_, c) =>
        Math.min(40, Math.max(4, ...rows.slice(0, 200).map((r) => (r[c] ?? '').length)))
    );
    const total = lengths.reduce((a, b) => a + b, 0);
    const widths = lengths.map((len) => Math.max(MIN_COL, (len / total) * available));
    const scale = available / widths.reduce((a, b) => a + b, 0);
    return widths.map((w) => w * scale);
}

export default function ExcelToPdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const [orientation, setOrientation] = useState<Orientation>('landscape');
    const tool = useToolRunner();

    const convertToPdf = () => {
        if (!file) return;
        tool.run(async () => {
            const XLSX = await import('xlsx');
            let wb: import('xlsx').WorkBook;
            try {
                wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
            } catch {
                throw new PdfToolError('This file is not a valid Excel workbook.');
            }

            const pdfDoc = await PDFDocument.create();
            const font = await embedUnicodeFont(pdfDoc, 'regular');
            const bold = await embedUnicodeFont(pdfDoc, 'bold');
            const [pageWidth, pageHeight] = orientation === 'landscape' ? [A4[1], A4[0]] : A4;
            const available = pageWidth - 2 * MARGIN;

            for (const sheetName of wb.SheetNames) {
                tool.setProgress(`Converting sheet "${sheetName}"...`);
                // `raw: false` returns the formatted text (dates, currency, percentages) as shown in Excel.
                const rows = (XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '', raw: false, blankrows: false }) as unknown[][])
                    .map((r) => r.map((v) => String(v ?? '')));
                if (rows.length === 0) continue;

                const columns = Math.max(...rows.map((r) => r.length));
                // Very wide sheets are split into chunks of columns that fit the page width.
                const chunkSize = Math.max(1, Math.floor(available / (MIN_COL * 1.5)));
                for (let start = 0; start < columns; start += chunkSize) {
                    const end = Math.min(columns, start + chunkSize);
                    const chunk = rows.map((r) => r.slice(start, end));
                    const widths = columnWidths(chunk, end - start, available);

                    let page: PDFPage = pdfDoc.addPage([pageWidth, pageHeight]);
                    let y = pageHeight - MARGIN;
                    const title = toDrawableText(bold, columns > chunkSize ? `${sheetName} (columns ${start + 1}-${end})` : sheetName);
                    page.drawText(title, { x: MARGIN, y: y - 12, size: 12, font: bold, color: rgb(0.13, 0.45, 0.27) });
                    y -= 26;

                    const drawRow = (cells: string[], rowFont: PDFFont, shade?: [number, number, number]) => {
                        const wrapped = cells.map((cell, c) => wrapText(rowFont, toDrawableText(rowFont, cell), FONT_SIZE, widths[c] - 2 * CELL_PAD).slice(0, 8));
                        const height = Math.max(1, ...wrapped.map((lines) => lines.length)) * LINE_HEIGHT + 2 * CELL_PAD;
                        if (y - height < MARGIN) {
                            page = pdfDoc.addPage([pageWidth, pageHeight]);
                            y = pageHeight - MARGIN;
                            if (rowFont !== bold && chunk[0]) drawRow(chunk[0], bold, [0.85, 0.93, 0.86]); // repeat header
                        }
                        if (shade) page.drawRectangle({ x: MARGIN, y: y - height, width: available, height, color: rgb(...shade) });
                        let x = MARGIN;
                        wrapped.forEach((lines, c) => {
                            lines.forEach((line, l) => {
                                if (line) page.drawText(line, { x: x + CELL_PAD, y: y - CELL_PAD - FONT_SIZE - l * LINE_HEIGHT + 2, size: FONT_SIZE, font: rowFont, color: rgb(0.1, 0.1, 0.1) });
                            });
                            x += widths[c];
                        });
                        page.drawLine({ start: { x: MARGIN, y: y - height }, end: { x: MARGIN + available, y: y - height }, thickness: 0.4, color: rgb(0.8, 0.8, 0.8) });
                        y -= height;
                    };

                    chunk.forEach((row, index) => {
                        if (index === 0) drawRow(row, bold, [0.85, 0.93, 0.86]);
                        else drawRow(row, font, index % 2 === 0 ? [0.96, 0.96, 0.96] : undefined);
                    });
                }
            }

            if (pdfDoc.getPageCount() === 0) throw new PdfToolError('This workbook has no data to convert.');
            return { blob: await savePdf(pdfDoc), filename: `${baseName(file.name)}.pdf` };
        }, "Error converting file. Please ensure it's a valid Excel file.");
    };

    const reset = () => {
        tool.reset();
        setFile(null);
    };

    return (
        <div className="container">
            <ToolHeader title="Excel to PDF" subtitle="Convert spreadsheets (XLSX, XLS, CSV) into clean, readable PDF tables." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={(files) => setFile(files[0] ?? null)} accept=".xlsx,.xls,.csv,.ods" />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace>
                    <SelectedFile file={file} onRemove={reset} icon={FileSpreadsheet} />
                    <OptionsCard title="Page orientation">
                        <ChoiceGroup
                            label="Orientation"
                            value={orientation}
                            onChange={setOrientation}
                            options={[
                                { value: 'landscape', title: 'Landscape', text: 'Best for wide tables' },
                                { value: 'portrait', title: 'Portrait' },
                            ]}
                        />
                    </OptionsCard>
                    <Notice>Each sheet starts on a new page. Long text wraps inside its cell and the header row repeats on every page.</Notice>
                    <PrimaryAction onClick={convertToPdf}>
                        Convert to PDF <ArrowRight size={22} />
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status={tool.progress || 'Converting spreadsheet...'} />}

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
