"use client";
import { useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, EyeOff, Search, Trash2, X } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import PdfPagePreview from '@/components/PdfPagePreview';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, PrimaryAction, Notice, toolStyles } from '@/components/ToolUI';
import { baseName, loadPdf, PdfToolError, pdfBytesToBlob } from '@/lib/pdf';
import { findTextToRedact, redactPdf, type RedactBox } from '@/lib/redact';
import { useToolRunner } from '@/lib/useToolRunner';

const MIN_BOX = 0.005;

function sameBox(a: RedactBox, b: RedactBox) {
    return a.page === b.page && Math.abs(a.x - b.x) < 1e-4 && Math.abs(a.y - b.y) < 1e-4 && Math.abs(a.w - b.w) < 1e-4 && Math.abs(a.h - b.h) < 1e-4;
}

export default function RedactPdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState(1);
    const [pageNumber, setPageNumber] = useState(1);
    const [boxes, setBoxes] = useState<RedactBox[]>([]);
    const [draft, setDraft] = useState<RedactBox | null>(null);
    const [query, setQuery] = useState('');
    const [searchStatus, setSearchStatus] = useState('');
    const [searching, setSearching] = useState(false);
    const [stripHiddenInfo, setStripHiddenInfo] = useState(true);
    const start = useRef<{ x: number; y: number } | null>(null);
    const tool = useToolRunner();

    const handleFilesSelected = (files: File[]) => {
        const selected = files[0];
        if (!selected) return;
        loadPdf(selected)
            .then((doc) => {
                setFile(selected);
                setPageCount(doc.getPageCount());
                setPageNumber(1);
                setBoxes([]);
            })
            .catch((err) => tool.notify(err instanceof PdfToolError ? err.message : 'Could not open this PDF.'));
    };

    const pointFrom = (e: React.PointerEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        return {
            x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
            y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
        };
    };

    const boxBetween = (a: { x: number; y: number }, b: { x: number; y: number }): RedactBox => ({
        page: pageNumber,
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        w: Math.abs(b.x - a.x),
        h: Math.abs(b.y - a.y),
    });

    const findText = async () => {
        if (!file || !query.trim()) return;
        setSearching(true);
        setSearchStatus('');
        try {
            const found = await findTextToRedact(file, query);
            const added = found.filter((box) => !boxes.some((existing) => sameBox(existing, box)));
            setBoxes((prev) => [...prev, ...added]);
            const pages = new Set(found.map((box) => box.page));
            setSearchStatus(
                found.length === 0
                    ? `No matches for "${query.trim()}". Scanned pages have no text: draw boxes by hand instead.`
                    : `Marked ${found.length} match${found.length === 1 ? '' : 'es'} on ${pages.size} page${pages.size === 1 ? '' : 's'}.`
            );
            if (found.length) setPageNumber(found[0].page);
        } catch {
            setSearchStatus('Could not search this PDF.');
        } finally {
            setSearching(false);
        }
    };

    const redact = () => {
        if (!file || boxes.length === 0) return;
        tool.run(async () => {
            const bytes = await redactPdf(file, boxes, { stripHiddenInfo }, tool.setProgress);
            return { blob: pdfBytesToBlob(bytes), filename: `${baseName(file.name)}_redacted.pdf` };
        }, 'Could not redact this PDF. Please try again.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
        setBoxes([]);
        setQuery('');
        setSearchStatus('');
    };

    const pageBoxes = boxes.map((box, index) => ({ box, index })).filter(({ box }) => box.page === pageNumber);
    const redactedPages = new Set(boxes.map((box) => box.page)).size;
    const pct = (value: number) => `${value * 100}%`;

    return (
        <div className="container">
            <ToolHeader title="Redact PDF" subtitle="Permanently black out names, numbers and other sensitive information. Redacted content is removed, not just hidden." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={handleFilesSelected} accept=".pdf" />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace wide>
                    <SelectedFile file={file} onRemove={reset} icon={EyeOff} />

                    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', alignItems: 'start' }}>
                        <div style={{ display: 'grid', gap: 20 }}>
                            <OptionsCard title="1. Find text to redact">
                                <div className={toolStyles.field}>
                                    <label className={toolStyles.label} htmlFor="redact-query">Word or phrase</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            id="redact-query"
                                            className={toolStyles.input}
                                            value={query}
                                            placeholder="e.g. a name, account or phone number"
                                            onChange={(e) => setQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && findText()}
                                        />
                                        <button type="button" className="btn btn-outline" onClick={findText} disabled={searching || !query.trim()} style={{ whiteSpace: 'nowrap' }}>
                                            <Search size={16} aria-hidden="true" /> {searching ? 'Searching...' : 'Mark all'}
                                        </button>
                                    </div>
                                </div>
                                {searchStatus && (
                                    <p className={toolStyles.hint} role="status" style={{ marginTop: 8 }}>
                                        {searchStatus}
                                    </p>
                                )}
                            </OptionsCard>

                            <OptionsCard title="2. Or draw boxes on the page">
                                <p className={toolStyles.hint}>Drag over any area of the preview to black it out. Click × on a box to remove it.</p>
                                <p style={{ margin: '12px 0 0', fontWeight: 600 }}>
                                    {boxes.length} area{boxes.length === 1 ? '' : 's'} on {redactedPages} page{redactedPages === 1 ? '' : 's'}
                                </p>
                                {boxes.length > 0 && (
                                    <button type="button" className="btn btn-outline" style={{ marginTop: 10, padding: '8px 12px', fontSize: 14 }} onClick={() => setBoxes([])}>
                                        <Trash2 size={15} aria-hidden="true" /> Clear all
                                    </button>
                                )}
                                <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 }}>
                                    <input type="checkbox" checked={stripHiddenInfo} onChange={(e) => setStripHiddenInfo(e.target.checked)} />
                                    Also remove hidden information (title, author, metadata, attachments)
                                </label>
                            </OptionsCard>

                            <Notice>
                                Pages with redactions are turned into images, so the blacked-out text cannot be copied or recovered. Text on those pages will no longer be selectable. Other pages are kept as they are.
                            </Notice>
                        </div>

                        <OptionsCard title={`Page ${pageNumber} of ${pageCount}`}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                                <button type="button" className="btn btn-outline" aria-label="Previous page" disabled={pageNumber <= 1} onClick={() => setPageNumber((n) => n - 1)} style={{ padding: '6px 10px' }}>
                                    <ChevronLeft size={18} />
                                </button>
                                <button type="button" className="btn btn-outline" aria-label="Next page" disabled={pageNumber >= pageCount} onClick={() => setPageNumber((n) => n + 1)} style={{ padding: '6px 10px' }}>
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                            <PdfPagePreview
                                file={file}
                                pageNumber={pageNumber}
                                maxWidth={520}
                                overlayProps={{
                                    'aria-label': 'Page preview. Drag to mark an area for redaction.',
                                    style: { cursor: 'crosshair' },
                                    onPointerDown: (e) => {
                                        if ((e.target as HTMLElement).closest('button')) return;
                                        start.current = pointFrom(e);
                                        setDraft(null);
                                        e.currentTarget.setPointerCapture(e.pointerId);
                                    },
                                    onPointerMove: (e) => {
                                        if (start.current) setDraft(boxBetween(start.current, pointFrom(e)));
                                    },
                                    onPointerUp: (e) => {
                                        if (!start.current) return;
                                        const box = boxBetween(start.current, pointFrom(e));
                                        start.current = null;
                                        setDraft(null);
                                        if (box.w > MIN_BOX && box.h > MIN_BOX) setBoxes((prev) => [...prev, box]);
                                    },
                                }}
                            >
                                {pageBoxes.map(({ box, index }) => (
                                    <div
                                        key={index}
                                        data-testid="redact-box"
                                        style={{ position: 'absolute', left: pct(box.x), top: pct(box.y), width: pct(box.w), height: pct(box.h), background: 'rgba(0,0,0,0.8)', outline: '1px solid #f43f5e' }}
                                    >
                                        <button
                                            type="button"
                                            aria-label="Remove this redaction"
                                            onClick={() => setBoxes((prev) => prev.filter((_, i) => i !== index))}
                                            style={{ position: 'absolute', top: -9, right: -9, width: 18, height: 18, borderRadius: '50%', border: 'none', background: '#f43f5e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' }}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                {draft && (
                                    <div style={{ position: 'absolute', left: pct(draft.x), top: pct(draft.y), width: pct(draft.w), height: pct(draft.h), background: 'rgba(0,0,0,0.5)', border: '1px dashed #f43f5e' }} />
                                )}
                            </PdfPagePreview>
                        </OptionsCard>
                    </div>

                    <div style={{ maxWidth: 480, width: '100%', margin: '0 auto' }}>
                        <PrimaryAction onClick={redact} disabled={boxes.length === 0}>
                            Redact PDF <ArrowRight size={22} />
                        </PrimaryAction>
                    </div>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status={tool.progress || 'Redacting PDF...'} />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="PDF redacted successfully!"
                />
            )}
        </div>
    );
}
