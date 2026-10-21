"use client";
import { useState } from 'react';
import { Trash2, FileText, XCircle } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, PrimaryAction, toolStyles } from '@/components/ToolUI';
import { baseName, loadPdf, parsePageRanges, PdfToolError, savePdf, setPageOrder } from '@/lib/pdf';
import { usePdfThumbnails } from '@/lib/usePdfThumbnails';
import { useToolRunner } from '@/lib/useToolRunner';
import grid from '@/components/PageGrid.module.css';

export default function RemovePagesClient() {
    const [file, setFile] = useState<File | null>(null);
    const [removed, setRemoved] = useState<Set<number>>(new Set());
    const [rangeInput, setRangeInput] = useState('');
    const tool = useToolRunner();
    const { pageCount, thumbnails, error } = usePdfThumbnails(tool.status === 'DONE' ? null : file);

    const handleFilesSelected = (files: File[]) => {
        const selected = files[0];
        if (!selected) return;
        loadPdf(selected)
            .then(() => {
                setFile(selected);
                setRemoved(new Set());
            })
            .catch((err) => tool.notify(err instanceof PdfToolError ? err.message : 'Could not open this PDF.'));
    };

    const toggle = (pageNum: number) => {
        setRemoved((prev) => {
            const next = new Set(prev);
            if (next.has(pageNum)) next.delete(pageNum);
            else next.add(pageNum);
            return next;
        });
    };

    const applyRangeInput = () => {
        if (!pageCount || !rangeInput.trim()) return;
        const { pages, invalid } = parsePageRanges(rangeInput, pageCount);
        if (invalid.length) {
            tool.notify(`Invalid page range: "${invalid.join('", "')}". This PDF has ${pageCount} pages.`);
            return;
        }
        setRemoved((prev) => new Set([...prev, ...pages]));
        setRangeInput('');
    };

    const removedCount = removed.size;
    const remainingCount = (pageCount ?? 0) - removedCount;

    const removePages = () => {
        if (!file) return;
        if (removedCount === 0) return tool.notify('Please select at least one page to remove.');
        if (remainingCount <= 0) return tool.notify('You cannot remove all pages. At least 1 page must remain.');
        tool.run(async () => {
            const pdfDoc = await loadPdf(file);
            setPageOrder(pdfDoc, pdfDoc.getPages().filter((_, i) => !removed.has(i + 1)));
            return { blob: await savePdf(pdfDoc), filename: `${baseName(file.name)}_cleaned.pdf` };
        }, 'Failed to remove pages. Please try again.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
        setRemoved(new Set());
        setRangeInput('');
    };

    return (
        <div className="container">
            <ToolHeader title="Remove Pages from PDF" subtitle="Delete unwanted pages from your PDF file. Fast, free, and private." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={handleFilesSelected} accept=".pdf" />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace wide>
                    <SelectedFile
                        file={file}
                        onRemove={reset}
                        detail={
                            pageCount === null
                                ? 'Reading pages...'
                                : `${pageCount} pages · ${removedCount} marked for removal · ${remainingCount} will remain`
                        }
                    />

                    <OptionsCard>
                        <div className={grid.toolbar}>
                            <p className={toolStyles.hint} style={{ fontSize: 'var(--text-sm)' }}>
                                Click a page to mark or unmark it, or enter pages to mark:
                            </p>
                            <div style={{ display: 'flex', gap: 8, flex: '1 1 260px', maxWidth: 380 }}>
                                <input
                                    type="text"
                                    value={rangeInput}
                                    onChange={(e) => setRangeInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && applyRangeInput()}
                                    placeholder="e.g. 1, 3, 5-8"
                                    aria-label="Pages to mark for removal"
                                    className={toolStyles.input}
                                />
                                <button type="button" className="btn btn-outline" onClick={applyRangeInput}>
                                    Mark
                                </button>
                                {removedCount > 0 && (
                                    <button type="button" className="btn btn-outline" onClick={() => setRemoved(new Set())}>
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    </OptionsCard>

                    {error && <p role="alert" style={{ color: 'var(--error)', textAlign: 'center' }}>{error}</p>}

                    <div className={grid.grid}>
                        {Array.from({ length: pageCount ?? 0 }, (_, i) => i + 1).map((pageNum) => {
                            const isRemoved = removed.has(pageNum);
                            return (
                                <button
                                    key={pageNum}
                                    type="button"
                                    onClick={() => toggle(pageNum)}
                                    aria-pressed={isRemoved}
                                    aria-label={`Page ${pageNum}${isRemoved ? ', marked for removal' : ''}`}
                                    className={`${grid.tile} ${isRemoved ? grid.tileSelected : ''}`}
                                >
                                    <div className={grid.thumb}>
                                        {thumbnails[pageNum] ? (
                                            // eslint-disable-next-line @next/next/no-img-element -- local blob: URL
                                            <img src={thumbnails[pageNum]} alt="" style={isRemoved ? { filter: 'grayscale(1)', opacity: 0.6 } : undefined} />
                                        ) : (
                                            <div className={grid.thumbPlaceholder}>
                                                <FileText size={28} />
                                                <span>Page {pageNum}</span>
                                            </div>
                                        )}
                                        {isRemoved && (
                                            <div className={grid.thumbOverlay}>
                                                <XCircle size={40} />
                                            </div>
                                        )}
                                    </div>
                                    <div className={grid.tileFooter}>
                                        <span>Page {pageNum}</span>
                                        <span style={{ color: isRemoved ? 'var(--error)' : 'var(--success)' }}>{isRemoved ? 'Remove' : 'Keep'}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ maxWidth: 480, width: '100%', margin: '0 auto' }}>
                        <PrimaryAction onClick={removePages} disabled={removedCount === 0 || remainingCount <= 0}>
                            <Trash2 size={20} /> Remove {removedCount} {removedCount === 1 ? 'Page' : 'Pages'}
                        </PrimaryAction>
                    </div>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status="Removing selected pages..." />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message={`Successfully removed ${removedCount} ${removedCount === 1 ? 'page' : 'pages'}!`}
                />
            )}
        </div>
    );
}
