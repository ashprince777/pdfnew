"use client";
import { useState } from 'react';
import { ArrowRight, ArrowUp, ArrowDown, FileText, GripVertical, Trash2, Lock } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import ReorderableList from '@/components/ReorderableList';
import { ToolHeader, ToolWorkspace, PrimaryAction, Notice, toolStyles } from '@/components/ToolUI';
import { formatBytes, loadPdf, PdfToolError, pdfBytesToBlob } from '@/lib/pdf';
import { runPdfOp } from '@/lib/pdfWorkerClient';
import { useToolRunner } from '@/lib/useToolRunner';

interface MergeItem {
    id: string;
    file: File;
    pages?: number;
    problem?: string;
}

let nextId = 0;

export default function MergeClient() {
    const [items, setItems] = useState<MergeItem[]>([]);
    const tool = useToolRunner();

    const handleFilesSelected = (newFiles: File[]) => {
        const added = newFiles.map((file) => ({ id: `merge-${++nextId}`, file }));
        setItems((prev) => [...prev, ...added]);
        // Inspect each file in the background so problems show up before merging.
        for (const item of added) {
            loadPdf(item.file)
                .then((doc) => ({ pages: doc.getPageCount() }))
                .catch((error: unknown) => ({
                    problem: error instanceof PdfToolError && error.code === 'ENCRYPTED' ? 'Password-protected: unlock it first' : 'Not a valid PDF',
                }))
                .then((info) => setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, ...info } : p))));
        }
    };

    const removeItem = (id: string) => setItems((prev) => prev.filter((p) => p.id !== id));

    const problems = items.filter((i) => i.problem);
    const totalPages = items.reduce((sum, i) => sum + (i.pages ?? 0), 0);

    const mergePdfs = () => {
        if (items.length < 2) {
            tool.notify('Please select at least 2 PDF files to merge.');
            return;
        }
        if (problems.length > 0) {
            tool.notify(`Remove or unlock "${problems[0].file.name}" before merging.`);
            return;
        }
        tool.run(async () => {
            tool.setProgress('Reading files...');
            const files = await Promise.all(items.map(async (item) => ({ name: item.file.name, bytes: await item.file.arrayBuffer() })));
            const merged = await runPdfOp('mergePdfs', [files], tool.setProgress);
            return { blob: pdfBytesToBlob(merged), filename: 'merged.pdf' };
        }, 'An error occurred while merging PDFs. Please try again.');
    };

    const reset = () => {
        tool.reset();
        setItems([]);
    };

    return (
        <div className="container">
            <ToolHeader title="Merge PDF Files" subtitle="Combine PDFs in the order you want with the easiest PDF merger available." />

            {tool.status === 'IDLE' && items.length === 0 && <FileUploader onFilesSelected={handleFilesSelected} multiple />}

            {tool.status === 'IDLE' && items.length > 0 && (
                <ToolWorkspace>
                    <p className={toolStyles.hint} style={{ textAlign: 'center', fontSize: 'var(--text-sm)' }}>
                        Drag files (or use the arrows) to set the order. {items.length} files
                        {totalPages > 0 && `, ${totalPages} pages`}.
                    </p>

                    <ReorderableList
                        label="Files to merge"
                        items={items}
                        getKey={(item) => item.id}
                        onReorder={setItems}
                        className="merge-list"
                        renderItem={(item, controls) => (
                            <div
                                className={`${toolStyles.card} ${toolStyles.fileCard}`}
                                style={{ padding: '12px 14px', marginBottom: 10, cursor: 'grab' }}
                            >
                                <div className={toolStyles.fileMeta}>
                                    <GripVertical size={18} style={{ color: 'var(--text-light)', flexShrink: 0 }} aria-hidden="true" />
                                    <span style={{ fontWeight: 700, color: 'var(--text-light)', minWidth: 22 }}>{controls.index + 1}.</span>
                                    <div className={toolStyles.fileIcon} style={item.problem ? { color: 'var(--error)' } : undefined}>
                                        {item.problem ? <Lock size={20} /> : <FileText size={20} />}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <p className={toolStyles.fileName} title={item.file.name}>{item.file.name}</p>
                                        <p className={toolStyles.fileDetail} style={item.problem ? { color: 'var(--error)' } : undefined}>
                                            {formatBytes(item.file.size)}
                                            {item.pages !== undefined && ` · ${item.pages} ${item.pages === 1 ? 'page' : 'pages'}`}
                                            {item.problem && ` · ${item.problem}`}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexShrink: 0 }}>
                                    <button type="button" className={toolStyles.iconButton} onClick={controls.moveUp} disabled={controls.isFirst} aria-label={`Move ${item.file.name} up`}>
                                        <ArrowUp size={18} />
                                    </button>
                                    <button type="button" className={toolStyles.iconButton} onClick={controls.moveDown} disabled={controls.isLast} aria-label={`Move ${item.file.name} down`}>
                                        <ArrowDown size={18} />
                                    </button>
                                    <button type="button" className={toolStyles.iconButton} onClick={() => removeItem(item.id)} aria-label={`Remove ${item.file.name}`}>
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    />

                    <FileUploader onFilesSelected={handleFilesSelected} multiple variant="compact" currentCount={items.length} />

                    {items.length === 1 && <Notice>Add at least one more PDF to merge.</Notice>}

                    <PrimaryAction onClick={mergePdfs} disabled={items.length < 2 || problems.length > 0}>
                        Merge PDF <ArrowRight size={20} />
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status={tool.progress || 'Merging PDFs...'} />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="PDFs merged successfully into one document!"
                />
            )}
        </div>
    );
}
