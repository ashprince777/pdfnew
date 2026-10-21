"use client";
import { useEffect, useRef, useState } from 'react';
import { PDFDocument, rgb, type PDFPage } from '@cantoo/pdf-lib';
import { ArrowLeftRight, FileText, Download, RotateCcw } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, PrimaryAction, toolStyles } from '@/components/ToolUI';
import { embedUnicodeFont, getErrorMessage, pdfBytesToBlob, toDrawableText, wrapText } from '@/lib/pdf';
import { openPdfjsDocument } from '@/lib/pdfjs';
import { getPositionedText, groupIntoRows, rowText } from '@/lib/textLayout';
import { useToast } from '@/components/ToastProvider';

type Op = { type: 'same' | 'added' | 'removed'; text: string };

interface PageDiff {
    pageNum: number;
    ops: Op[];
    added: number;
    removed: number;
    same: number;
}

async function extractLines(file: File): Promise<string[][]> {
    const doc = await openPdfjsDocument(await file.arrayBuffer());
    const pages: string[][] = [];
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const { items } = await getPositionedText(page);
        pages.push(groupIntoRows(items).map((row) => rowText(row.items)).filter(Boolean));
        page.cleanup();
    }
    await doc.destroy();
    return pages;
}

/** Line diff based on the longest common subsequence, so moved/repeated lines are reported correctly. */
function diffLines(a: string[], b: string[]): Op[] {
    const n = a.length;
    const m = b.length;
    if (n * m > 4_000_000) {
        // Pathologically long pages: fall back to a cheap comparison.
        const inB = new Set(b);
        const inA = new Set(a);
        return [...a.map((text) => ({ type: inB.has(text) ? 'same' : 'removed', text }) as Op), ...b.filter((t) => !inA.has(t)).map((text) => ({ type: 'added', text }) as Op)];
    }
    const lcs: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
        }
    }
    const ops: Op[] = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
        if (a[i] === b[j]) {
            ops.push({ type: 'same', text: a[i] });
            i++;
            j++;
        } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
            ops.push({ type: 'removed', text: a[i++] });
        } else {
            ops.push({ type: 'added', text: b[j++] });
        }
    }
    while (i < n) ops.push({ type: 'removed', text: a[i++] });
    while (j < m) ops.push({ type: 'added', text: b[j++] });
    return ops;
}

async function buildReport(original: File, modified: File, pages: PageDiff[]): Promise<Blob> {
    const pdfDoc = await PDFDocument.create();
    const font = await embedUnicodeFont(pdfDoc, 'regular');
    const bold = await embedUnicodeFont(pdfDoc, 'bold');
    const width = 595.28;
    const height = 841.89;
    const margin = 50;
    let page: PDFPage = pdfDoc.addPage([width, height]);
    let y = height - margin;

    const write = (text: string, size: number, f = font, color = rgb(0.1, 0.1, 0.1), indent = 0) => {
        for (const line of wrapText(f, toDrawableText(f, text), size, width - 2 * margin - indent)) {
            if (y - size * 1.4 < margin) {
                page = pdfDoc.addPage([width, height]);
                y = height - margin;
            }
            page.drawText(line, { x: margin + indent, y: y - size, size, font: f, color });
            y -= size * 1.4;
        }
    };

    const totals = pages.reduce((t, p) => ({ added: t.added + p.added, removed: t.removed + p.removed }), { added: 0, removed: 0 });
    write('PDF Comparison Report', 20, bold);
    y -= 6;
    write(`Original: ${original.name}`, 10);
    write(`Modified: ${modified.name}`, 10);
    write(`${totals.added} lines added, ${totals.removed} lines removed across ${pages.length} pages.`, 10, bold);
    y -= 10;

    for (const p of pages) {
        if (p.added === 0 && p.removed === 0) continue;
        y -= 6;
        write(`Page ${p.pageNum}: +${p.added} / -${p.removed}`, 12, bold);
        for (const op of p.ops) {
            if (op.type === 'removed') write(`- ${op.text}`, 9, font, rgb(0.75, 0.1, 0.1), 8);
            if (op.type === 'added') write(`+ ${op.text}`, 9, font, rgb(0.05, 0.5, 0.2), 8);
        }
    }
    if (totals.added === 0 && totals.removed === 0) write('No text differences were found.', 11);
    return pdfBytesToBlob(await pdfDoc.save());
}

export default function ComparePdfClient() {
    const { showToast } = useToast();
    const [file1, setFile1] = useState<File | null>(null);
    const [file2, setFile2] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [progress, setProgress] = useState('');
    const [pages, setPages] = useState<PageDiff[]>([]);
    const [selectedPage, setSelectedPage] = useState(1);
    const [reportUrl, setReportUrl] = useState<string | null>(null);
    const reportRef = useRef<string | null>(null);

    useEffect(() => () => {
        if (reportRef.current) URL.revokeObjectURL(reportRef.current);
    }, []);

    const runComparison = async () => {
        if (!file1 || !file2) return;
        setStatus('PROCESSING');
        try {
            setProgress('Reading the original document...');
            const a = await extractLines(file1);
            setProgress('Reading the modified document...');
            const b = await extractLines(file2);
            setProgress('Comparing text...');
            const result: PageDiff[] = [];
            for (let i = 0; i < Math.max(a.length, b.length); i++) {
                const ops = diffLines(a[i] || [], b[i] || []);
                result.push({
                    pageNum: i + 1,
                    ops,
                    added: ops.filter((o) => o.type === 'added').length,
                    removed: ops.filter((o) => o.type === 'removed').length,
                    same: ops.filter((o) => o.type === 'same').length,
                });
            }
            if (a.every((p) => p.length === 0) && b.every((p) => p.length === 0)) {
                showToast('Neither PDF contains selectable text (they may be scans), so there is nothing to compare.', 'error');
                setStatus('IDLE');
                return;
            }
            setPages(result);
            setSelectedPage(result.find((p) => p.added || p.removed)?.pageNum ?? 1);
            setStatus('DONE');
        } catch (error) {
            console.error('Error comparing PDFs', error);
            showToast(getErrorMessage(error, 'Failed to compare PDFs. Please ensure both files are valid.'), 'error');
            setStatus('IDLE');
        }
    };

    const downloadReport = async () => {
        if (!file1 || !file2) return;
        try {
            const blob = await buildReport(file1, file2, pages);
            if (reportRef.current) URL.revokeObjectURL(reportRef.current);
            reportRef.current = URL.createObjectURL(blob);
            setReportUrl(reportRef.current);
            const a = document.createElement('a');
            a.href = reportRef.current;
            a.download = 'comparison_report.pdf';
            a.click();
        } catch (error) {
            console.error('Could not generate report', error);
            showToast('Could not generate the report.', 'error');
        }
    };

    const reset = () => {
        if (reportRef.current) URL.revokeObjectURL(reportRef.current);
        reportRef.current = null;
        setReportUrl(null);
        setFile1(null);
        setFile2(null);
        setPages([]);
        setStatus('IDLE');
    };

    const current = pages.find((p) => p.pageNum === selectedPage);
    const totals = pages.reduce((t, p) => ({ added: t.added + p.added, removed: t.removed + p.removed }), { added: 0, removed: 0 });

    const slot = (label: string, file: File | null, setFile: (f: File | null) => void) => (
        <OptionsCard title={label}>
            {file ? <SelectedFile file={file} onRemove={() => setFile(null)} icon={FileText} /> : <FileUploader onFilesSelected={(files) => setFile(files[0] ?? null)} accept=".pdf" variant="compact" />}
        </OptionsCard>
    );

    return (
        <div className="container" style={{ paddingBottom: 60 }}>
            <ToolHeader title="Compare PDF Documents" subtitle="Find the text that was added, removed or changed between two versions of a PDF." />

            {status === 'IDLE' && (
                <ToolWorkspace wide>
                    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' }}>
                        {slot('Original PDF', file1, setFile1)}
                        {slot('Modified PDF', file2, setFile2)}
                    </div>
                    <div style={{ maxWidth: 480, width: '100%', margin: '0 auto' }}>
                        <PrimaryAction onClick={runComparison} disabled={!file1 || !file2}>
                            Compare Documents <ArrowLeftRight size={22} />
                        </PrimaryAction>
                    </div>
                </ToolWorkspace>
            )}

            {status === 'PROCESSING' && <Processing status={progress || 'Comparing documents...'} />}

            {status === 'DONE' && current && (
                <ToolWorkspace wide>
                    <OptionsCard>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                            <p style={{ fontWeight: 600 }}>
                                <span style={{ color: 'var(--success)' }}>+{totals.added} added</span> ·{' '}
                                <span style={{ color: 'var(--error)' }}>−{totals.removed} removed</span>
                            </p>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button type="button" className="btn btn-outline" style={{ gap: 6 }} onClick={downloadReport}>
                                    <Download size={16} /> Download report PDF
                                </button>
                                <button type="button" className="btn btn-outline" style={{ gap: 6 }} onClick={reset}>
                                    <RotateCcw size={16} /> New comparison
                                </button>
                            </div>
                        </div>
                        {reportUrl && (
                            <p className={toolStyles.hint} style={{ marginTop: 8 }}>
                                Report downloaded. <a href={reportUrl} download="comparison_report.pdf" style={{ textDecoration: 'underline' }}>Download again</a>
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }} role="tablist" aria-label="Pages">
                            {pages.map((p) => {
                                const changed = p.added + p.removed > 0;
                                return (
                                    <button
                                        key={p.pageNum}
                                        type="button"
                                        role="tab"
                                        aria-selected={selectedPage === p.pageNum}
                                        onClick={() => setSelectedPage(p.pageNum)}
                                        className={selectedPage === p.pageNum ? 'btn btn-primary' : 'btn btn-outline'}
                                        style={{ padding: '4px 10px', fontSize: 13, borderColor: changed && selectedPage !== p.pageNum ? 'var(--warning)' : undefined }}
                                        title={changed ? `${p.added} added, ${p.removed} removed` : 'No changes'}
                                    >
                                        {p.pageNum}
                                        {changed ? ' •' : ''}
                                    </button>
                                );
                            })}
                        </div>
                    </OptionsCard>

                    <OptionsCard title={`Page ${current.pageNum}: +${current.added} / −${current.removed} · ${current.same} unchanged`}>
                        <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, maxHeight: 520, overflowY: 'auto', display: 'grid', gap: 2 }}>
                            {current.ops.length === 0 && <p className={toolStyles.hint}>No text on this page in either document.</p>}
                            {current.ops.map((op, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        padding: '2px 8px',
                                        borderRadius: 4,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        background:
                                            op.type === 'added'
                                                ? 'color-mix(in srgb, var(--success) 18%, transparent)'
                                                : op.type === 'removed'
                                                  ? 'color-mix(in srgb, var(--error) 18%, transparent)'
                                                  : 'transparent',
                                        color: op.type === 'same' ? 'var(--text-light)' : 'var(--text-color)',
                                        textDecoration: op.type === 'removed' ? 'line-through' : undefined,
                                    }}
                                >
                                    {op.type === 'added' ? '+ ' : op.type === 'removed' ? '− ' : '  '}
                                    {op.text}
                                </div>
                            ))}
                        </div>
                    </OptionsCard>
                </ToolWorkspace>
            )}
        </div>
    );
}
