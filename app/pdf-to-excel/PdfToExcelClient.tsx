"use client";
import { useState } from 'react';
import { FileSpreadsheet, ArrowRight } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, ChoiceGroup, PrimaryAction, Notice } from '@/components/ToolUI';
import { baseName } from '@/lib/pdf';
import { openPdfjsDocument } from '@/lib/pdfjs';
import { getPositionedText, groupIntoRows, splitIntoCells } from '@/lib/textLayout';
import { useToolRunner } from '@/lib/useToolRunner';

type SheetMode = 'per_page' | 'single';
type Cell = string | number;

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** "1,234.50" -> 1234.5, but keeps codes like "007" or "12-34" as text. */
function toCellValue(text: string): Cell {
    const t = text.trim();
    if (/^-?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/.test(t) && !/^0\d/.test(t)) {
        const n = Number(t.replace(/,/g, ''));
        if (Number.isFinite(n)) return n;
    }
    return t;
}

/** Finds column positions shared by the whole page so cells of a table line up. */
function columnAnchors(xs: number[], tolerance = 12): number[] {
    const sorted = [...xs].sort((a, b) => a - b);
    const anchors: number[] = [];
    for (const x of sorted) {
        if (anchors.length === 0 || x - anchors[anchors.length - 1] > tolerance) anchors.push(x);
    }
    return anchors;
}

export default function PdfToExcelClient() {
    const [file, setFile] = useState<File | null>(null);
    const [sheetMode, setSheetMode] = useState<SheetMode>('per_page');
    const tool = useToolRunner();

    const convertToExcel = () => {
        if (!file) return;
        tool.run(async () => {
            const [XLSX, pdfDoc] = await Promise.all([import('xlsx'), openPdfjsDocument(await file.arrayBuffer())]);
            const wb = XLSX.utils.book_new();
            const combined: Cell[][] = [];

            for (let i = 1; i <= pdfDoc.numPages; i++) {
                tool.setProgress(`Extracting data from page ${i} of ${pdfDoc.numPages}...`);
                const page = await pdfDoc.getPage(i);
                const { items } = await getPositionedText(page);
                page.cleanup();

                const rows = groupIntoRows(items).map((row) => splitIntoCells(row.items));
                const anchors = columnAnchors(rows.flatMap((cells) => cells.map((c) => c.x)));
                const sheet: Cell[][] = rows.map((cells) => {
                    const out: Cell[] = [];
                    for (const cell of cells) {
                        // Place the cell in the right-most column that starts at or before it.
                        let col = 0;
                        while (col + 1 < anchors.length && anchors[col + 1] <= cell.x + 6) col++;
                        while (out.length < col) out.push('');
                        out[col] = out[col] !== undefined && out[col] !== '' ? `${out[col]} ${cell.text}` : toCellValue(cell.text);
                    }
                    return out;
                });

                if (sheetMode === 'single') {
                    if (combined.length) combined.push([]);
                    combined.push(...sheet);
                } else if (sheet.length) {
                    XLSX.utils.book_append_sheet(wb, makeSheet(XLSX, sheet), `Page ${i}`);
                }
            }
            await pdfDoc.destroy();

            if (sheetMode === 'single' && combined.length) XLSX.utils.book_append_sheet(wb, makeSheet(XLSX, combined), 'Data');
            if (wb.SheetNames.length === 0) {
                XLSX.utils.book_append_sheet(
                    wb,
                    XLSX.utils.aoa_to_sheet([['No extractable text was found in this PDF.'], ['It may be a scanned document (images only).']]),
                    'Sheet1'
                );
            }

            tool.setProgress('Generating Excel file...');
            const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
            return { blob: new Blob([data], { type: XLSX_MIME }), filename: `${baseName(file.name)}.xlsx` };
        }, 'Error generating the spreadsheet. Please try again.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
    };

    return (
        <div className="container">
            <ToolHeader title="PDF to Excel" subtitle="Extract tables and data from PDF files into editable Excel spreadsheets." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={(files) => setFile(files[0] ?? null)} accept=".pdf" />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace>
                    <SelectedFile file={file} onRemove={reset} icon={FileSpreadsheet} />
                    <OptionsCard title="Output">
                        <ChoiceGroup
                            label="Worksheets"
                            value={sheetMode}
                            onChange={setSheetMode}
                            options={[
                                { value: 'per_page', title: 'One sheet per page' },
                                { value: 'single', title: 'All pages in one sheet' },
                            ]}
                        />
                    </OptionsCard>
                    <Notice>Works best with PDFs created digitally (not scans). Numbers are stored as real numbers so you can calculate with them.</Notice>
                    <PrimaryAction onClick={convertToExcel}>
                        Convert to Excel <ArrowRight size={22} />
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status={tool.progress || 'Extracting tables to Excel...'} />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="Your Excel spreadsheet is ready!"
                />
            )}
        </div>
    );
}

function makeSheet(XLSX: typeof import('xlsx'), rows: Cell[][]) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const columns = Math.max(0, ...rows.map((r) => r.length));
    ws['!cols'] = Array.from({ length: columns }, (_, c) => ({
        wch: Math.min(50, Math.max(8, ...rows.map((r) => String(r[c] ?? '').length + 2))),
    }));
    return ws;
}
