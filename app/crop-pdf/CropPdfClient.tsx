"use client";
import { useState } from 'react';
import { Crop, ArrowRight } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import PdfPagePreview, { type PageSize } from '@/components/PdfPagePreview';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, ChoiceGroup, PrimaryAction, toolStyles } from '@/components/ToolUI';
import { baseName, getVisualFrame, loadPdf, PdfToolError, savePdf } from '@/lib/pdf';
import { useToolRunner } from '@/lib/useToolRunner';

type Preset = 'small' | 'medium' | 'large' | 'custom';
type Side = 'top' | 'bottom' | 'left' | 'right';
type Margins = Record<Side, number>;

const PRESETS: Record<Exclude<Preset, 'custom'>, number> = { small: 18, medium: 36, large: 72 };
const MIN_SIZE = 36;

export default function CropPdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const [margins, setMargins] = useState<Margins>({ top: 36, bottom: 36, left: 36, right: 36 });
    const [preset, setPreset] = useState<Preset>('medium');
    const [pageSize, setPageSize] = useState<PageSize>({ width: 612, height: 792 });
    const tool = useToolRunner();

    const handleFilesSelected = (files: File[]) => {
        const selected = files[0];
        if (!selected) return;
        loadPdf(selected)
            .then(() => setFile(selected))
            .catch((err) => tool.notify(err instanceof PdfToolError ? err.message : 'Could not open this PDF.'));
    };

    const choosePreset = (value: Preset) => {
        setPreset(value);
        if (value !== 'custom') {
            const m = PRESETS[value];
            setMargins({ top: m, bottom: m, left: m, right: m });
        }
    };

    const setMargin = (side: Side, value: number) => {
        setPreset('custom');
        setMargins((prev) => ({ ...prev, [side]: Math.max(0, value) }));
    };

    const tooLarge = margins.left + margins.right > pageSize.width - MIN_SIZE || margins.top + margins.bottom > pageSize.height - MIN_SIZE;

    const cropPdf = () => {
        if (!file) return;
        tool.run(async () => {
            const pdfDoc = await loadPdf(file);
            for (const page of pdfDoc.getPages()) {
                const frame = getVisualFrame(page);
                const { left, right, top, bottom } = margins;
                if (left + right > frame.width - MIN_SIZE || top + bottom > frame.height - MIN_SIZE) {
                    throw new PdfToolError('The margins are larger than one of the pages. Please use smaller values.');
                }
                // Margins are given as the reader sees the page; map both corners back to PDF space.
                const a = frame.toPdf(left, bottom);
                const b = frame.toPdf(frame.width - right, frame.height - top);
                const x = Math.min(a.x, b.x);
                const y = Math.min(a.y, b.y);
                page.setCropBox(x, y, Math.abs(b.x - a.x), Math.abs(b.y - a.y));
            }
            return { blob: await savePdf(pdfDoc), filename: `${baseName(file.name)}_cropped.pdf` };
        }, 'Failed to crop PDF. Please check the margin values.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
    };

    const pct = (value: number, total: number) => `${Math.min(100, (value / total) * 100)}%`;
    const shade = 'rgba(15, 23, 42, 0.45)';

    return (
        <div className="container">
            <ToolHeader title="Crop PDF Online" subtitle="Trim the margins of every page. The preview shows exactly what will be removed." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={handleFilesSelected} accept=".pdf" />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace wide>
                    <SelectedFile file={file} onRemove={reset} icon={Crop} />

                    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', alignItems: 'start' }}>
                        <OptionsCard title="Margins to remove (points, 72 pt = 1 inch)">
                            <ChoiceGroup
                                label="Preset"
                                value={preset}
                                onChange={choosePreset}
                                options={[
                                    { value: 'small', title: 'Small' },
                                    { value: 'medium', title: 'Medium' },
                                    { value: 'large', title: 'Large' },
                                    { value: 'custom', title: 'Custom' },
                                ]}
                            />
                            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', marginTop: 16 }}>
                                {(['top', 'bottom', 'left', 'right'] as Side[]).map((side) => (
                                    <div key={side} className={toolStyles.field}>
                                        <label className={toolStyles.label} htmlFor={`crop-${side}`} style={{ textTransform: 'capitalize' }}>
                                            {side}
                                        </label>
                                        <input
                                            id={`crop-${side}`}
                                            type="number"
                                            min={0}
                                            value={margins[side]}
                                            onChange={(e) => setMargin(side, parseInt(e.target.value) || 0)}
                                            className={toolStyles.input}
                                        />
                                    </div>
                                ))}
                            </div>
                            {tooLarge && (
                                <p role="alert" className={toolStyles.hint} style={{ color: 'var(--error)', marginTop: 10 }}>
                                    These margins are larger than the page.
                                </p>
                            )}
                        </OptionsCard>

                        <OptionsCard title="Preview (page 1)">
                            <PdfPagePreview file={file} pageNumber={1} maxWidth={420} onPageSize={setPageSize}>
                                <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: pct(margins.top, pageSize.height), background: shade }} />
                                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: pct(margins.bottom, pageSize.height), background: shade }} />
                                <div style={{ position: 'absolute', left: 0, top: pct(margins.top, pageSize.height), bottom: pct(margins.bottom, pageSize.height), width: pct(margins.left, pageSize.width), background: shade }} />
                                <div style={{ position: 'absolute', right: 0, top: pct(margins.top, pageSize.height), bottom: pct(margins.bottom, pageSize.height), width: pct(margins.right, pageSize.width), background: shade }} />
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: pct(margins.left, pageSize.width),
                                        right: pct(margins.right, pageSize.width),
                                        top: pct(margins.top, pageSize.height),
                                        bottom: pct(margins.bottom, pageSize.height),
                                        border: '2px dashed var(--primary)',
                                    }}
                                />
                            </PdfPagePreview>
                        </OptionsCard>
                    </div>

                    <div style={{ maxWidth: 480, width: '100%', margin: '0 auto' }}>
                        <PrimaryAction onClick={cropPdf} disabled={tooLarge}>
                            Crop PDF <ArrowRight size={22} />
                        </PrimaryAction>
                    </div>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status="Cropping PDF pages..." />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="PDF cropped successfully!"
                />
            )}
        </div>
    );
}
