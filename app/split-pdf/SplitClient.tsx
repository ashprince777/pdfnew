"use client";
import { useState } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
import JSZip from 'jszip';
import { ArrowRight, Scissors } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, ChoiceGroup, PrimaryAction, toolStyles } from '@/components/ToolUI';
import { baseName, loadPdf, parsePageRanges, PdfToolError, pdfBytesToBlob } from '@/lib/pdf';
import { useToolRunner } from '@/lib/useToolRunner';

type Mode = 'ALL_PAGES' | 'EXTRACT' | 'RANGES';

const MODES: { value: Mode; title: string; text: string }[] = [
    { value: 'ALL_PAGES', title: 'Every page', text: 'One PDF per page (ZIP)' },
    { value: 'EXTRACT', title: 'Extract pages', text: 'Selected pages in one PDF' },
    { value: 'RANGES', title: 'Split by ranges', text: 'One PDF per range (ZIP)' },
];

async function buildPdf(source: PDFDocument, pageNumbers: number[]): Promise<Uint8Array> {
    const out = await PDFDocument.create();
    const pages = await out.copyPages(source, pageNumbers.map((p) => p - 1));
    pages.forEach((page) => out.addPage(page));
    return out.save();
}

export default function SplitClient() {
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [mode, setMode] = useState<Mode>('ALL_PAGES');
    const [ranges, setRanges] = useState('');
    const tool = useToolRunner();

    const handleFilesSelected = (files: File[]) => {
        const selected = files[0];
        if (!selected) return;
        setFile(selected);
        setPageCount(null);
        loadPdf(selected)
            .then((doc) => setPageCount(doc.getPageCount()))
            .catch((error) => {
                tool.notify(error instanceof PdfToolError ? error.message : 'Could not open this PDF.');
                setFile(null);
            });
    };

    const splitPdf = () => {
        if (!file) return;
        tool.run(async () => {
            const pdfDoc = await loadPdf(file);
            const total = pdfDoc.getPageCount();
            const name = baseName(file.name);

            if (mode === 'ALL_PAGES') {
                const zip = new JSZip();
                for (let i = 1; i <= total; i++) {
                    tool.setProgress(`Creating page ${i} of ${total}...`);
                    zip.file(`${name}_page_${String(i).padStart(String(total).length, '0')}.pdf`, await buildPdf(pdfDoc, [i]));
                }
                tool.setProgress('Creating ZIP archive...');
                return { blob: await zip.generateAsync({ type: 'blob' }), filename: `${name}_split.zip` };
            }

            if (!ranges.trim()) throw new PdfToolError('Please enter the pages to extract, for example 1-3, 5.');

            if (mode === 'EXTRACT') {
                const { pages, invalid } = parsePageRanges(ranges, total);
                if (invalid.length) throw new PdfToolError(`Invalid page range: "${invalid.join('", "')}". This PDF has ${total} pages.`);
                const unique = Array.from(new Set(pages)).sort((a, b) => a - b);
                return { blob: pdfBytesToBlob(await buildPdf(pdfDoc, unique)), filename: `${name}_extracted.pdf` };
            }

            // RANGES: each comma-separated part becomes its own file
            const parts = ranges.split(',').map((p) => p.trim()).filter(Boolean);
            const zip = new JSZip();
            for (const part of parts) {
                const { pages, invalid } = parsePageRanges(part, total);
                if (invalid.length || pages.length === 0) {
                    throw new PdfToolError(`Invalid page range: "${part}". This PDF has ${total} pages.`);
                }
                zip.file(`${name}_pages_${part.replace(/\s+/g, '')}.pdf`, await buildPdf(pdfDoc, pages));
            }
            return { blob: await zip.generateAsync({ type: 'blob' }), filename: `${name}_ranges.zip` };
        }, 'An error occurred while splitting the PDF.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
        setRanges('');
        setPageCount(null);
    };

    return (
        <div className="container">
            <ToolHeader title="Split PDF File" subtitle="Extract pages from your PDF or save each page as a separate PDF file." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={handleFilesSelected} />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace>
                    <SelectedFile file={file} onRemove={reset} icon={Scissors} detail={pageCount !== null ? `${pageCount} pages` : 'Reading...'} />

                    <OptionsCard title="Split options">
                        <ChoiceGroup label="Split mode" options={MODES} value={mode} onChange={setMode} />

                        {mode !== 'ALL_PAGES' && (
                            <div className={toolStyles.field} style={{ marginTop: 16 }}>
                                <label className={toolStyles.label} htmlFor="split-ranges">
                                    {mode === 'EXTRACT' ? 'Pages to extract' : 'Ranges (each becomes a file)'}
                                </label>
                                <input
                                    id="split-ranges"
                                    type="text"
                                    value={ranges}
                                    onChange={(e) => setRanges(e.target.value)}
                                    placeholder={mode === 'EXTRACT' ? 'Example: 1-5, 8, 11-13' : 'Example: 1-3, 4-6, 7'}
                                    className={toolStyles.input}
                                />
                                {pageCount !== null && <span className={toolStyles.hint}>Pages 1 to {pageCount}</span>}
                            </div>
                        )}
                    </OptionsCard>

                    <PrimaryAction onClick={splitPdf}>
                        Split PDF <ArrowRight size={20} />
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status={tool.progress || 'Splitting PDF...'} />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message={mode === 'EXTRACT' ? 'Selected pages extracted into a new PDF!' : 'Your PDF has been split!'}
                />
            )}
        </div>
    );
}
