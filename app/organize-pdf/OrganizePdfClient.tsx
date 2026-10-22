"use client";
import { useState } from 'react';
import { Trash2, ArrowRight, ArrowLeft, FileText, RotateCw, RotateCcw, Undo2 } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import ReorderableList from '@/components/ReorderableList';
import { ToolHeader, ToolWorkspace, SelectedFile, PrimaryAction, toolStyles } from '@/components/ToolUI';
import { baseName, loadPdf, PdfToolError, pdfBytesToBlob } from '@/lib/pdf';
import { usePdfThumbnails } from '@/lib/usePdfThumbnails';
import { runPdfOp } from '@/lib/pdfWorkerClient';
import { useToolRunner } from '@/lib/useToolRunner';
import grid from '@/components/PageGrid.module.css';

interface PageItem {
    /** 1-based page number in the original file */
    original: number;
    /** Extra clockwise rotation chosen by the user */
    rotation: number;
}

const initialPages = (count: number): PageItem[] => Array.from({ length: count }, (_, i) => ({ original: i + 1, rotation: 0 }));

export default function OrganizePdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<PageItem[]>([]);
    const [originalCount, setOriginalCount] = useState(0);
    const tool = useToolRunner();
    const { thumbnails, error } = usePdfThumbnails(tool.status === 'DONE' ? null : file);

    const handleFilesSelected = (files: File[]) => {
        const selected = files[0];
        if (!selected) return;
        loadPdf(selected)
            .then((doc) => {
                setFile(selected);
                setOriginalCount(doc.getPageCount());
                setPages(initialPages(doc.getPageCount()));
            })
            .catch((err) => tool.notify(err instanceof PdfToolError ? err.message : 'Could not open this PDF.'));
    };

    const rotate = (original: number, delta: number) =>
        setPages((prev) => prev.map((p) => (p.original === original ? { ...p, rotation: (p.rotation + delta + 360) % 360 } : p)));

    const deletePage = (original: number) => {
        if (pages.length <= 1) return tool.notify('A PDF must contain at least 1 page.');
        setPages((prev) => prev.filter((p) => p.original !== original));
    };

    const isUnchanged = pages.length === originalCount && pages.every((p, i) => p.original === i + 1 && p.rotation === 0);

    const saveChanges = () => {
        if (!file || pages.length === 0) return;
        tool.run(async () => {
            const order = pages.map(({ original, rotation }) => ({ original, rotation }));
            const bytes = await runPdfOp('arrangePages', [await file.arrayBuffer(), order]);
            return { blob: pdfBytesToBlob(bytes), filename: `${baseName(file.name)}_organized.pdf` };
        }, 'Failed to save organized PDF. Please try again.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
        setPages([]);
    };

    return (
        <div className="container">
            <ToolHeader title="Organize PDF" subtitle="Drag to reorder pages, rotate them, or delete the ones you don't need." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={handleFilesSelected} accept=".pdf" />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace wide>
                    <SelectedFile file={file} onRemove={reset} detail={`${pages.length} pages`} />

                    <div className={grid.toolbar}>
                        <p className={toolStyles.hint} style={{ fontSize: 'var(--text-sm)' }}>
                            Drag pages to reorder them, or use the buttons under each page.
                        </p>
                        {!isUnchanged && (
                            <button type="button" className="btn btn-outline" style={{ gap: 6 }} onClick={() => setPages(initialPages(originalCount))}>
                                <Undo2 size={16} /> Undo all changes
                            </button>
                        )}
                    </div>

                    {error && <p role="alert" style={{ color: 'var(--error)', textAlign: 'center' }}>{error}</p>}

                    <ReorderableList
                        label="Pages"
                        items={pages}
                        getKey={(item) => String(item.original)}
                        onReorder={setPages}
                        className={grid.grid}
                        renderItem={(item, controls) => (
                            <div className={grid.tile} style={{ cursor: 'grab' }}>
                                <div className={grid.thumb}>
                                    {thumbnails[item.original] ? (
                                        // eslint-disable-next-line @next/next/no-img-element -- local blob: URL
                                        <img src={thumbnails[item.original]} alt={`Page ${item.original}`} draggable={false} style={{ transform: `rotate(${item.rotation}deg)` }} />
                                    ) : (
                                        <div className={grid.thumbPlaceholder}>
                                            <FileText size={28} />
                                            <span>Page {item.original}</span>
                                        </div>
                                    )}
                                </div>
                                <div className={grid.tileFooter}>
                                    <span>#{controls.index + 1}</span>
                                    <span style={{ color: 'var(--text-light)' }}>
                                        Page {item.original}
                                        {item.rotation ? ` · ${item.rotation}°` : ''}
                                    </span>
                                </div>
                                <div className={grid.tileActions}>
                                    <button type="button" className={toolStyles.iconButton} onClick={controls.moveUp} disabled={controls.isFirst} aria-label={`Move page ${item.original} earlier`} title="Move earlier">
                                        <ArrowLeft size={16} />
                                    </button>
                                    <button type="button" className={toolStyles.iconButton} onClick={() => rotate(item.original, -90)} aria-label={`Rotate page ${item.original} left`} title="Rotate left">
                                        <RotateCcw size={16} />
                                    </button>
                                    <button type="button" className={toolStyles.iconButton} onClick={() => rotate(item.original, 90)} aria-label={`Rotate page ${item.original} right`} title="Rotate right">
                                        <RotateCw size={16} />
                                    </button>
                                    <button type="button" className={toolStyles.iconButton} onClick={() => deletePage(item.original)} aria-label={`Delete page ${item.original}`} title="Delete page">
                                        <Trash2 size={16} />
                                    </button>
                                    <button type="button" className={toolStyles.iconButton} onClick={controls.moveDown} disabled={controls.isLast} aria-label={`Move page ${item.original} later`} title="Move later">
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    />

                    <div style={{ maxWidth: 480, width: '100%', margin: '0 auto' }}>
                        <PrimaryAction onClick={saveChanges}>
                            Save Organized PDF <ArrowRight size={20} />
                        </PrimaryAction>
                    </div>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status="Reorganizing and saving PDF..." />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="Your organized PDF is ready!"
                />
            )}
        </div>
    );
}
