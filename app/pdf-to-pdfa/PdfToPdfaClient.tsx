"use client";
import { useState } from 'react';
import { PDFDict, PDFName, PDFDocument } from '@cantoo/pdf-lib';
import { Archive, ArrowRight } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, ChoiceGroup, PrimaryAction, Notice } from '@/components/ToolUI';
import { baseName, loadPdf, savePdf } from '@/lib/pdf';
import { useToolRunner } from '@/lib/useToolRunner';

type Conformance = '1B' | '2B' | '3B';

const LEVELS: { value: Conformance; title: string; text: string }[] = [
    { value: '1B', title: 'PDF/A-1b', text: 'ISO 19005-1. Widest archive compatibility' },
    { value: '2B', title: 'PDF/A-2b', text: 'ISO 19005-2. Allows transparency, JPEG2000' },
    { value: '3B', title: 'PDF/A-3b', text: 'ISO 19005-3. Allows embedded attachments' },
];

/** Names of fonts used by the document that are not embedded (PDF/A requires embedding). */
function findNonEmbeddedFonts(doc: PDFDocument): string[] {
    const names = new Set<string>();
    const FontType = PDFName.of('Font');
    const FontFiles = ['FontFile', 'FontFile2', 'FontFile3'].map((k) => PDFName.of(k));
    // Type3 glyphs are drawn inline; Type0 fonts are checked through their descendant CIDFont,
    // which is itself an indirect /Font object visited by this loop.
    const skipped = [PDFName.of('Type3'), PDFName.of('Type0')];
    for (const [, obj] of doc.context.enumerateIndirectObjects()) {
        if (!(obj instanceof PDFDict) || obj.get(PDFName.of('Type')) !== FontType) continue;
        const subtype = obj.get(PDFName.of('Subtype'));
        if (subtype instanceof PDFName && skipped.includes(subtype)) continue;
        const descriptor = doc.context.lookup(obj.get(PDFName.of('FontDescriptor')));
        const embedded = descriptor instanceof PDFDict && FontFiles.some((key) => descriptor.has(key));
        if (!embedded) {
            const base = obj.get(PDFName.of('BaseFont'));
            names.add(base instanceof PDFName ? base.decodeText() : 'Unnamed font');
        }
    }
    return [...names];
}

export default function PdfToPdfaClient() {
    const [file, setFile] = useState<File | null>(null);
    const [conformance, setConformance] = useState<Conformance>('2B');
    const [report, setReport] = useState<string[]>([]);
    const tool = useToolRunner();

    const convertToPdfA = () => {
        if (!file) return;
        tool.run(async () => {
            const pdfDoc = await loadPdf(file);
            if (!pdfDoc.getTitle()) pdfDoc.setTitle(baseName(file.name));
            pdfDoc.setProducer('MyOnlinePDF');
            pdfDoc.convertToPDFA({ conformance });

            const issues: string[] = [];
            const fonts = findNonEmbeddedFonts(pdfDoc);
            if (fonts.length) {
                issues.push(`${fonts.length} font(s) are not embedded (${fonts.slice(0, 4).join(', ')}${fonts.length > 4 ? '…' : ''}). Strict validators will reject the file; re-export it from the original application with fonts embedded.`);
            }
            setReport(issues);
            return { blob: await savePdf(pdfDoc), filename: `${baseName(file.name)}_PDFA-${conformance}.pdf` };
        }, 'Failed to convert to PDF/A. Please ensure the file is valid.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
        setReport([]);
    };

    return (
        <div className="container">
            <ToolHeader title="PDF to PDF/A Converter" subtitle="Prepare PDFs for long-term archiving with PDF/A metadata and an embedded colour profile." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={(files) => setFile(files[0] ?? null)} accept=".pdf" />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace>
                    <SelectedFile file={file} onRemove={reset} icon={Archive} />
                    <OptionsCard title="Archival conformance level">
                        <ChoiceGroup label="Conformance level" options={LEVELS} value={conformance} onChange={setConformance} />
                    </OptionsCard>
                    <Notice>
                        We add the PDF/A identification metadata and an sRGB output intent, and check that fonts are embedded.
                        For guaranteed compliance, verify the result with a validator such as veraPDF.
                    </Notice>
                    <PrimaryAction onClick={convertToPdfA}>
                        Convert to PDF/A <ArrowRight size={22} />
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status="Applying PDF/A metadata and colour profile..." />}

            {tool.status === 'DONE' && tool.result && (
                <div style={{ display: 'grid', gap: 16, maxWidth: 600, margin: '0 auto' }}>
                    {report.length > 0 && (
                        <Notice tone="warning">
                            {report.map((line) => (
                                <p key={line}>{line}</p>
                            ))}
                        </Notice>
                    )}
                    <DownloadResult
                        downloadUrl={tool.result.url}
                        downloadFilename={tool.result.filename}
                        fileSize={tool.result.size}
                        onReset={reset}
                        message={report.length ? `Converted to PDF/A-${conformance} with warnings` : `Converted to PDF/A-${conformance}!`}
                    />
                </div>
            )}
        </div>
    );
}
