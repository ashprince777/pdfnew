"use client";
import { useState } from 'react';
import JSZip from 'jszip';
import { FileImage, ArrowRight } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, ChoiceGroup, PrimaryAction } from '@/components/ToolUI';
import { baseName } from '@/lib/pdf';
import { canvasToBlob, openPdfjsDocument, releaseCanvas, renderPageToCanvas } from '@/lib/pdfjs';
import { useToolRunner } from '@/lib/useToolRunner';

type Dpi = '96' | '150' | '300';
type Format = 'jpg' | 'png';

/** The PDF to PNG page reuses this tool with PNG preselected and its own heading. */
export default function PdfToJpgClient({
    title = 'PDF to JPG',
    subtitle = 'Convert each PDF page into a high-quality JPG or PNG image.',
    defaultFormat = 'jpg',
}: { title?: string; subtitle?: string; defaultFormat?: Format }) {
    const [file, setFile] = useState<File | null>(null);
    const [dpi, setDpi] = useState<Dpi>('150');
    const [format, setFormat] = useState<Format>(defaultFormat);
    const tool = useToolRunner();

    const convert = () => {
        if (!file) return;
        tool.run(async () => {
            const pdfDoc = await openPdfjsDocument(await file.arrayBuffer());
            const total = pdfDoc.numPages;
            const name = baseName(file.name);
            const mime = format === 'png' ? 'image/png' : 'image/jpeg';
            const images: { name: string; blob: Blob }[] = [];

            for (let i = 1; i <= total; i++) {
                tool.setProgress(`Converting page ${i} of ${total}...`);
                const page = await pdfDoc.getPage(i);
                const canvas = await renderPageToCanvas(page, parseInt(dpi) / 72);
                images.push({ name: `${name}_page_${String(i).padStart(String(total).length, '0')}.${format}`, blob: await canvasToBlob(canvas, mime, 0.92) });
                releaseCanvas(canvas);
                page.cleanup();
            }
            await pdfDoc.destroy();

            if (images.length === 1) return { blob: images[0].blob, filename: images[0].name };

            tool.setProgress('Creating ZIP file...');
            const zip = new JSZip();
            images.forEach((img) => zip.file(img.name, img.blob));
            return { blob: await zip.generateAsync({ type: 'blob' }), filename: `${name}_images.zip` };
        }, 'Error converting file. Please try again.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
    };

    return (
        <div className="container">
            <ToolHeader title={title} subtitle={subtitle} />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={(files) => setFile(files[0] ?? null)} accept=".pdf" />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace>
                    <SelectedFile file={file} onRemove={reset} icon={FileImage} />
                    <OptionsCard title="Image options">
                        <div style={{ display: 'grid', gap: 14 }}>
                            <ChoiceGroup
                                label="Resolution"
                                value={dpi}
                                onChange={setDpi}
                                options={[
                                    { value: '96', title: 'Screen', text: '96 DPI, small files' },
                                    { value: '150', title: 'Standard', text: '150 DPI' },
                                    { value: '300', title: 'Print', text: '300 DPI, large files' },
                                ]}
                            />
                            <ChoiceGroup
                                label="Format"
                                value={format}
                                onChange={setFormat}
                                options={[
                                    { value: 'jpg', title: 'JPG', text: 'Smaller files' },
                                    { value: 'png', title: 'PNG', text: 'Lossless, sharp text' },
                                ]}
                            />
                        </div>
                    </OptionsCard>
                    <PrimaryAction onClick={convert}>
                        Convert to {format.toUpperCase()} <ArrowRight size={22} />
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status={tool.progress || 'Converting PDF to images...'} />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message={tool.result.filename.endsWith('.zip') ? 'Your images are ready in a ZIP archive!' : 'Your image is ready!'}
                />
            )}
        </div>
    );
}
