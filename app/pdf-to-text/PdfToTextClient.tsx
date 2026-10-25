"use client";
import { useState } from 'react';
import { Type, ArrowRight } from 'lucide-react';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, ChoiceGroup, PrimaryAction, Notice } from '@/components/ToolUI';
import { baseName } from '@/lib/pdf';
import { openPdfjsDocument, releaseCanvas } from '@/lib/pdfjs';
import { analyzePage, ocrPage } from '@/lib/pageAnalysis';
import { useToolRunner } from '@/lib/useToolRunner';

type Ocr = 'auto' | 'off';

export default function PdfToTextClient() {
    const [file, setFile] = useState<File | null>(null);
    const [ocr, setOcr] = useState<Ocr>('auto');
    const [ocrCount, setOcrCount] = useState(0);
    const tool = useToolRunner();

    const convert = () => {
        if (!file) return;
        tool.run(async () => {
            const pdfDoc = await openPdfjsDocument(await file.arrayBuffer());
            const total = pdfDoc.numPages;
            const pages: string[] = [];
            let scanned = 0;

            for (let i = 1; i <= total; i++) {
                tool.setProgress(`Reading page ${i} of ${total}...`);
                const page = await pdfDoc.getPage(i);
                const content = await page.getTextContent();
                let text = '';
                for (const raw of content.items) {
                    const item = raw as TextItem;
                    if (!('str' in item)) continue;
                    text += item.str + (item.hasEOL ? '\n' : '');
                }
                page.cleanup();
                text = text.replace(/[ \t]+\n/g, '\n').trim();

                // A page with no text layer is a scan or photo: read it with OCR.
                if (!text && ocr === 'auto') {
                    tool.setProgress(`Recognising text on page ${i} of ${total} (OCR)...`);
                    const analysis = await analyzePage(pdfDoc, i);
                    const segments = await ocrPage(analysis, (p) => tool.setProgress(`Recognising text on page ${i} of ${total} (OCR) ${Math.round(p * 100)}%...`));
                    releaseCanvas(analysis.canvas);
                    text = segments.map((s) => s.text).join('\n').trim();
                    if (text) scanned++;
                }
                pages.push(total > 1 ? `--- Page ${i} ---\n${text}` : text);
            }
            await pdfDoc.destroy();

            const output = pages.join('\n\n').trim();
            if (!output.replace(/--- Page \d+ ---/g, '').trim()) {
                tool.notify(ocr === 'off' ? 'No text found. This looks like a scanned PDF: turn on OCR and try again.' : 'No readable text was found in this PDF.');
                return;
            }
            setOcrCount(scanned);
            return { blob: new Blob([output], { type: 'text/plain;charset=utf-8' }), filename: `${baseName(file.name)}.txt` };
        }, 'Error reading the PDF. Please try again.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
    };

    return (
        <div className="container">
            <ToolHeader title="PDF to Text" subtitle="Extract all the text from a PDF into a plain .txt file, with OCR for scanned pages." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={(files) => setFile(files[0] ?? null)} accept=".pdf" />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace>
                    <SelectedFile file={file} onRemove={reset} icon={Type} />
                    <OptionsCard title="Text options">
                        <ChoiceGroup
                            label="Scanned pages"
                            value={ocr}
                            onChange={setOcr}
                            options={[
                                { value: 'auto', title: 'Use OCR', text: 'Read scanned pages too' },
                                { value: 'off', title: 'Text only', text: 'Faster, skips scans' },
                            ]}
                        />
                    </OptionsCard>
                    {ocr === 'auto' && (
                        <Notice>OCR runs on your device and currently reads English text. Scanned pages take a few seconds each.</Notice>
                    )}
                    <PrimaryAction onClick={convert}>
                        Extract text <ArrowRight size={22} />
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status={tool.progress || 'Extracting text...'} />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message={
                        ocrCount
                            ? `Your text file is ready! ${ocrCount} scanned page${ocrCount > 1 ? 's were' : ' was'} read with OCR, so check it for mistakes.`
                            : 'Your text file is ready!'
                    }
                />
            )}
        </div>
    );
}
