"use client";
import { useState } from 'react';
import { degrees } from '@cantoo/pdf-lib';
import { FileText, RotateCw, RotateCcw, ArrowRight } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, PrimaryAction, toolStyles } from '@/components/ToolUI';
import { baseName, loadPdf, PdfToolError, savePdf } from '@/lib/pdf';
import { usePdfThumbnails } from '@/lib/usePdfThumbnails';
import { useToolRunner } from '@/lib/useToolRunner';
import grid from '@/components/PageGrid.module.css';

export default function RotatePdfClient() {
    const [file, setFile] = useState<File | null>(null);
    /** Extra clockwise rotation per page, indexed by 0-based page index. */
    const [rotations, setRotations] = useState<number[]>([]);
    const tool = useToolRunner();
    const { thumbnails } = usePdfThumbnails(tool.status === 'DONE' ? null : file);

    const handleFilesSelected = (files: File[]) => {
        const selected = files[0];
        if (!selected) return;
        loadPdf(selected)
            .then((doc) => {
                setFile(selected);
                setRotations(new Array(doc.getPageCount()).fill(0));
            })
            .catch((err) => tool.notify(err instanceof PdfToolError ? err.message : 'Could not open this PDF.'));
    };

    const rotateAll = (delta: number) => setRotations((prev) => prev.map((r) => (r + delta + 360) % 360));
    const rotateOne = (index: number, delta: number) =>
        setRotations((prev) => prev.map((r, i) => (i === index ? (r + delta + 360) % 360 : r)));

    const hasChanges = rotations.some((r) => r !== 0);

    const applyRotation = () => {
        if (!file) return;
        if (!hasChanges) return tool.notify('Rotate at least one page first.');
        tool.run(async () => {
            const pdfDoc = await loadPdf(file);
            pdfDoc.getPages().forEach((page, i) => {
                if (rotations[i]) page.setRotation(degrees((page.getRotation().angle + rotations[i]) % 360));
            });
            return { blob: await savePdf(pdfDoc), filename: `${baseName(file.name)}_rotated.pdf` };
        }, 'Failed to rotate PDF. Please try again.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
        setRotations([]);
    };

    return (
        <div className="container">
            <ToolHeader title="Rotate PDF" subtitle="Rotate all pages at once, or click individual pages to rotate them permanently." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={handleFilesSelected} accept=".pdf" />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace wide>
                    <SelectedFile file={file} onRemove={reset} detail={`${rotations.length} pages`} />

                    <div className={grid.toolbar}>
                        <p className={toolStyles.hint} style={{ fontSize: 'var(--text-sm)' }}>Click a page to rotate it 90° clockwise.</p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button type="button" className="btn btn-outline" style={{ gap: 6 }} onClick={() => rotateAll(-90)}>
                                <RotateCcw size={18} /> Rotate all left
                            </button>
                            <button type="button" className="btn btn-outline" style={{ gap: 6 }} onClick={() => rotateAll(90)}>
                                <RotateCw size={18} /> Rotate all right
                            </button>
                            {hasChanges && (
                                <button type="button" className="btn btn-outline" onClick={() => setRotations((prev) => prev.map(() => 0))}>
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    <div className={grid.grid}>
                        {rotations.map((rotation, index) => (
                            <button
                                key={index}
                                type="button"
                                className={grid.tile}
                                onClick={() => rotateOne(index, 90)}
                                aria-label={`Page ${index + 1}, rotated ${rotation} degrees. Click to rotate clockwise.`}
                            >
                                <div className={grid.thumb}>
                                    {thumbnails[index + 1] ? (
                                        // eslint-disable-next-line @next/next/no-img-element -- local blob: URL
                                        <img src={thumbnails[index + 1]} alt="" style={{ transform: `rotate(${rotation}deg)` }} />
                                    ) : (
                                        <div className={grid.thumbPlaceholder}>
                                            <FileText size={28} />
                                            <span>Page {index + 1}</span>
                                        </div>
                                    )}
                                </div>
                                <div className={grid.tileFooter}>
                                    <span>Page {index + 1}</span>
                                    <span style={{ color: rotation ? 'var(--primary)' : 'var(--text-light)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <RotateCw size={12} /> {rotation}°
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div style={{ maxWidth: 480, width: '100%', margin: '0 auto' }}>
                        <PrimaryAction onClick={applyRotation} disabled={!hasChanges}>
                            Save PDF <ArrowRight size={20} />
                        </PrimaryAction>
                    </div>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status="Rotating pages..." />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="Your rotated PDF is ready!"
                />
            )}
        </div>
    );
}
