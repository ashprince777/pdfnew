"use client";
import { useState } from 'react';
import { rgb } from '@cantoo/pdf-lib';
import { Hash, ArrowRight } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, ChoiceGroup, PrimaryAction, toolStyles } from '@/components/ToolUI';
import { baseName, embedUnicodeFont, getVisualFrame, loadPdf, savePdf } from '@/lib/pdf';
import { useToolRunner } from '@/lib/useToolRunner';

type Position = 'top_left' | 'top_center' | 'top_right' | 'bottom_left' | 'bottom_center' | 'bottom_right';
type Format = 'number' | 'page_x' | 'page_x_of_y' | 'x_slash_y';

const POSITIONS: { value: Position; title: string }[] = [
    { value: 'top_left', title: 'Top Left' },
    { value: 'top_center', title: 'Top Center' },
    { value: 'top_right', title: 'Top Right' },
    { value: 'bottom_left', title: 'Bottom Left' },
    { value: 'bottom_center', title: 'Bottom Center' },
    { value: 'bottom_right', title: 'Bottom Right' },
];

const MARGIN = 28;

export default function PageNumbersClient() {
    const [file, setFile] = useState<File | null>(null);
    const [position, setPosition] = useState<Position>('bottom_center');
    const [format, setFormat] = useState<Format>('page_x_of_y');
    const [startNum, setStartNum] = useState(1);
    const [fontSize, setFontSize] = useState(11);
    const [skipFirst, setSkipFirst] = useState(false);
    const tool = useToolRunner();

    const addNumbers = () => {
        if (!file) return;
        tool.run(async () => {
            const pdfDoc = await loadPdf(file);
            const font = await embedUnicodeFont(pdfDoc);
            const pages = pdfDoc.getPages();
            const numbered = skipFirst ? pages.slice(1) : pages;
            const last = startNum + numbered.length - 1;

            numbered.forEach((page, i) => {
                const n = startNum + i;
                const text =
                    format === 'page_x' ? `Page ${n}` : format === 'page_x_of_y' ? `Page ${n} of ${last}` : format === 'x_slash_y' ? `${n} / ${last}` : `${n}`;

                const frame = getVisualFrame(page);
                const textWidth = font.widthOfTextAtSize(text, fontSize);
                const [vertical, horizontal] = position.split('_');
                const x = horizontal === 'left' ? MARGIN : horizontal === 'center' ? (frame.width - textWidth) / 2 : frame.width - textWidth - MARGIN;
                const y = vertical === 'top' ? frame.height - MARGIN - fontSize : MARGIN;
                const origin = frame.toPdf(x, y);

                page.drawText(text, { ...origin, size: fontSize, font, color: rgb(0.2, 0.2, 0.2), rotate: frame.rotate });
            });

            return { blob: await savePdf(pdfDoc), filename: `${baseName(file.name)}_numbered.pdf` };
        }, 'Failed to add page numbers. Please try again.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
    };

    return (
        <div className="container">
            <ToolHeader title="Add Page Numbers to PDF" subtitle="Insert page numbers into your PDF with customizable formatting and position." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={(files) => setFile(files[0] ?? null)} accept=".pdf" />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace>
                    <SelectedFile file={file} onRemove={reset} icon={Hash} />

                    <OptionsCard title="Position on page">
                        <ChoiceGroup label="Position" options={POSITIONS} value={position} onChange={setPosition} />
                    </OptionsCard>

                    <OptionsCard title="Format">
                        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                            <div className={toolStyles.field}>
                                <label className={toolStyles.label} htmlFor="pn-format">Number format</label>
                                <select id="pn-format" value={format} onChange={(e) => setFormat(e.target.value as Format)} className={toolStyles.input}>
                                    <option value="number">1, 2, 3...</option>
                                    <option value="page_x">Page 1, Page 2...</option>
                                    <option value="page_x_of_y">Page 1 of N</option>
                                    <option value="x_slash_y">1 / N</option>
                                </select>
                            </div>
                            <div className={toolStyles.field}>
                                <label className={toolStyles.label} htmlFor="pn-start">Start numbering at</label>
                                <input id="pn-start" type="number" min={1} value={startNum} onChange={(e) => setStartNum(Math.max(1, parseInt(e.target.value) || 1))} className={toolStyles.input} />
                            </div>
                            <div className={toolStyles.field}>
                                <label className={toolStyles.label} htmlFor="pn-size">Font size (pt)</label>
                                <input id="pn-size" type="number" min={6} max={48} value={fontSize} onChange={(e) => setFontSize(Math.min(48, Math.max(6, parseInt(e.target.value) || 11)))} className={toolStyles.input} />
                            </div>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, cursor: 'pointer' }}>
                            <input type="checkbox" checked={skipFirst} onChange={(e) => setSkipFirst(e.target.checked)} style={{ width: 18, height: 18 }} />
                            <span>Don&apos;t number the first page (cover)</span>
                        </label>
                    </OptionsCard>

                    <PrimaryAction onClick={addNumbers}>
                        Add Page Numbers <ArrowRight size={20} />
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status="Adding page numbers..." />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="Page numbers added successfully!"
                />
            )}
        </div>
    );
}
