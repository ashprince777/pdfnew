"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { FileText, ArrowRight, Trash2 } from 'lucide-react';
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ImageRun,
    AlignmentType,
    PageBreak,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
} from 'docx';
import JSZip from 'jszip';

interface TextLineCluster {
    ty: number;
    items: {
        str: string;
        tx: number;
        ty: number;
        width: number;
        height: number;
        fontName?: string;
    }[];
}

export default function PdfToWordClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [progress, setProgress] = useState('');

    const handleFilesSelected = (newFiles: File[]) => {
        if (newFiles.length > 0) {
            setFile(newFiles[0]);
        }
    };

    const removeFile = () => {
        setFile(null);
    };

    // Sanitize string to remove any illegal XML 1.0 control characters
    const sanitizeText = (str: string): string => {
        if (!str) return '';
        return str
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F]/g, '')
            .trim();
    };

    const convertToWord = async () => {
        if (!file) return;

        setStatus('PROCESSING');
        setProgress('Loading PDF document...');

        try {
            // Dynamic import to avoid SSR issues
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdfDoc = await loadingTask.promise;
            const totalPages = pdfDoc.numPages;

            const allChildren: (Paragraph | Table)[] = [];

            for (let i = 1; i <= totalPages; i++) {
                setProgress(`Processing page ${i} of ${totalPages}: preserving layout & images...`);
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 1.0 });

                const pageWidthPt = viewport.width;
                const pageHeightPt = viewport.height;

                // 1. Render page image to preserve visual fidelity, logos, stamps, and layout
                const renderScale = 1.5;
                const renderViewport = page.getViewport({ scale: renderScale });
                const canvas = document.createElement('canvas');
                canvas.width = renderViewport.width;
                canvas.height = renderViewport.height;
                const ctx = canvas.getContext('2d');

                let pageImgBytes: Uint8Array | null = null;
                if (ctx) {
                    await (page as any).render({ canvasContext: ctx, canvas, viewport: renderViewport }).promise;
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
                    const base64Data = dataUrl.split(',')[1];
                    const binaryStr = atob(base64Data);
                    const bytes = new Uint8Array(binaryStr.length);
                    for (let b = 0; b < binaryStr.length; b++) {
                        bytes[b] = binaryStr.charCodeAt(b);
                    }
                    pageImgBytes = bytes;
                }

                // Add preserved page image at top of the page section
                if (pageImgBytes) {
                    // Fit image neatly within margins (standard A4 printable width ~480-520 pt)
                    const displayWidth = Math.min(500, Math.round(pageWidthPt * 0.85));
                    const displayHeight = Math.round((displayWidth / pageWidthPt) * pageHeightPt);

                    allChildren.push(
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: pageImgBytes,
                                    type: 'jpg',
                                    transformation: {
                                        width: displayWidth,
                                        height: displayHeight,
                                    },
                                    altText: {
                                        name: `Page ${i} Document Visual`,
                                        title: `Page ${i} Visual`,
                                        description: `Original layout and graphics for Page ${i}`,
                                    },
                                }),
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 200 },
                        })
                    );
                }

                // 2. Extract editable text content
                setProgress(`Processing page ${i} of ${totalPages}: extracting editable text...`);
                const textContent = await page.getTextContent();
                const clusters: TextLineCluster[] = [];

                for (const item of textContent.items) {
                    if ('str' in item && item.str.trim()) {
                        const cleanStr = sanitizeText(item.str);
                        if (!cleanStr) continue;

                        const transform = (item as any).transform;
                        const tx = transform[4];
                        const ty = transform[5];
                        const width = (item as any).width || 10;
                        const height = Math.abs(transform[0]) || (item as any).height || 12;
                        const fontName = (item as any).fontName;

                        let foundCluster = clusters.find((c) => Math.abs(c.ty - ty) < 4.0);
                        if (!foundCluster) {
                            foundCluster = { ty, items: [] };
                            clusters.push(foundCluster);
                        }
                        foundCluster.items.push({
                            str: cleanStr,
                            tx,
                            ty,
                            width,
                            height,
                            fontName,
                        });
                    }
                }

                // Sort lines from top of the page to bottom (descending ty in PDF)
                clusters.sort((a, b) => b.ty - a.ty);

                // Section header for editable text
                allChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `--- Page ${i} Editable Content ---`,
                                bold: true,
                                size: 20,
                                color: '64748B',
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 150, after: 150 },
                    })
                );

                // Process lines into structured paragraphs or tables
                for (let cIdx = 0; cIdx < clusters.length; cIdx++) {
                    const cluster = clusters[cIdx];
                    cluster.items.sort((a, b) => a.tx - b.tx);

                    // Check if this line is multi-column (e.g. form fields, insurance key-values)
                    // If items are separated by a large horizontal gap (> 60 pt)
                    const hasMultiCol = cluster.items.length >= 2 && cluster.items.some((it, idx) => {
                        if (idx === 0) return false;
                        const prev = cluster.items[idx - 1];
                        return it.tx - (prev.tx + prev.width) > 60;
                    });

                    if (hasMultiCol && cluster.items.length <= 4) {
                        // Create a clean 2-4 column table for structured key-values
                        const cells = cluster.items.map((it) => {
                            const isBold = /bold|black|heavy|medium/i.test(it.fontName || '');
                            return new TableCell({
                                width: { size: Math.round(100 / cluster.items.length), type: WidthType.PERCENTAGE },
                                borders: {
                                    top: { style: BorderStyle.NONE },
                                    bottom: { style: BorderStyle.NONE },
                                    left: { style: BorderStyle.NONE },
                                    right: { style: BorderStyle.NONE },
                                },
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: it.str,
                                                size: Math.max(18, Math.min(36, Math.round((it.height || 11) * 2))),
                                                bold: isBold,
                                                font: 'Calibri',
                                            }),
                                        ],
                                        spacing: { before: 40, after: 40 },
                                    }),
                                ],
                            });
                        });

                        allChildren.push(
                            new Table({
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                borders: {
                                    top: { style: BorderStyle.NONE },
                                    bottom: { style: BorderStyle.NONE },
                                    left: { style: BorderStyle.NONE },
                                    right: { style: BorderStyle.NONE },
                                    insideHorizontal: { style: BorderStyle.NONE },
                                    insideVertical: { style: BorderStyle.NONE },
                                },
                                rows: [new TableRow({ children: cells })],
                            })
                        );
                        continue;
                    }

                    // Otherwise, combine line items into a natural flowing paragraph
                    let fullLineText = '';
                    let lastRight = -1;

                    for (const it of cluster.items) {
                        if (lastRight >= 0 && it.tx - lastRight > 2) {
                            fullLineText += ' ';
                        }
                        fullLineText += it.str;
                        lastRight = it.tx + it.width;
                    }

                    fullLineText = sanitizeText(fullLineText);
                    if (!fullLineText) continue;

                    const minX = Math.min(...cluster.items.map((it) => it.tx));
                    const maxX = Math.max(...cluster.items.map((it) => it.tx + it.width));
                    const maxH = Math.max(...cluster.items.map((it) => it.height));
                    const firstFont = cluster.items[0]?.fontName || '';
                    const isBold = /bold|black|heavy|medium/i.test(firstFont) || maxH > 14;
                    const isItalic = /italic|oblique/i.test(firstFont);

                    // Check if line is centered
                    const lineCenter = (minX + maxX) / 2;
                    const pageCenter = pageWidthPt / 2;
                    const isCentered = Math.abs(lineCenter - pageCenter) < 45 && fullLineText.length < 80;

                    // Indentation matching PDF position (if not centered)
                    const leftIndentDxa = isCentered ? 0 : Math.max(0, Math.min(3000, Math.round((minX - 40) * 15)));

                    const fontSizeHalfPt = Math.max(18, Math.min(48, Math.round(maxH * 2)));

                    allChildren.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: fullLineText,
                                    size: fontSizeHalfPt,
                                    bold: isBold,
                                    italics: isItalic,
                                    font: 'Calibri',
                                    color: '000000',
                                }),
                            ],
                            alignment: isCentered ? AlignmentType.CENTER : AlignmentType.LEFT,
                            indent: leftIndentDxa > 100 ? { left: leftIndentDxa } : undefined,
                            spacing: {
                                before: isBold ? 80 : 30,
                                after: isBold ? 80 : 40,
                            },
                        })
                    );
                }

                // Add PageBreak between PDF pages (except last)
                if (i < totalPages) {
                    allChildren.push(
                        new Paragraph({
                            children: [new PageBreak()],
                        })
                    );
                }
            }

            setProgress('Formatting Word document and validating XML...');

            const doc = new Document({
                sections: [
                    {
                        properties: {
                            page: {
                                size: {
                                    width: 11906, // A4
                                    height: 16838,
                                },
                                margin: {
                                    top: 720,
                                    bottom: 720,
                                    left: 720,
                                    right: 720,
                                    header: 360,
                                    footer: 360,
                                },
                            },
                        },
                        children: allChildren,
                    },
                ],
            });

            const rawDocxBuffer = await Packer.toArrayBuffer(doc);

            // Post-process with JSZip to ensure 100% compliance with Microsoft Word (Word 2007, 2010, 2016, 365)
            const zip = await JSZip.loadAsync(rawDocxBuffer);
            let docXml = await zip.file('word/document.xml')?.async('text') || '';

            // 1. Ensure all wp:docPr drawing IDs and names are unique and non-empty
            let docPrCounter = 1;
            docXml = docXml.replace(/<wp:docPr\s+id="[^"]*"\s*name="[^"]*"/g, () => {
                const cur = docPrCounter++;
                return `<wp:docPr id="${cur}" name="Picture ${cur}"`;
            });
            docXml = docXml.replace(/<wp:docPr\s+id="[^"]*"/g, () => {
                const cur = docPrCounter++;
                return `<wp:docPr id="${cur}" name="Picture ${cur}"`;
            });

            // 2. Ensure all pic:cNvPr drawing IDs are unique
            let cNvCounter = 1;
            docXml = docXml.replace(/<pic:cNvPr\s+id="[^"]*"/g, () => {
                return `<pic:cNvPr id="${cNvCounter++}"`;
            });

            // 3. Strip any remaining illegal XML 1.0 control characters
            docXml = docXml.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F]/g, '');

            zip.file('word/document.xml', docXml);

            const finalBlob = await zip.generateAsync({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });

            // Revoke any previous URL
            if (downloadUrl) URL.revokeObjectURL(downloadUrl);

            const url = URL.createObjectURL(finalBlob);
            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error: any) {
            console.error("Error generating DOCX:", error);
            alert("Error generating file: " + (error?.message || "Please try again."));
            setStatus('IDLE');
        }
    };

    const reset = () => {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setFile(null);
        setStatus('IDLE');
        setDownloadUrl(null);
        setProgress('');
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1 className="text-4xl font-bold mb-4">PDF to Word</h1>
                <p className="text-muted mb-8 text-lg">Convert your PDF files to editable Word documents (DOCX), preserving images, layout, and editable text positions.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} multiple={false} accept=".pdf" />
            )}

            {status === 'IDLE' && file && (
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-red-100 p-3 rounded-lg">
                                <FileText className="text-red-600 w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="font-medium text-lg">{file.name}</h3>
                                <p className="text-gray-500 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        </div>
                        <button
                            onClick={removeFile}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-red-500"
                            title="Remove file"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>

                    <div className="flex justify-center">
                        <button
                            onClick={convertToWord}
                            className="btn btn-primary btn-lg flex items-center gap-2 px-8 py-4 text-xl"
                        >
                            Convert to Word <ArrowRight size={24} />
                        </button>
                    </div>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status={progress || "Converting PDF to Word..."} />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={`${file?.name ? file.name.replace(/\.[^/.]+$/, '') : 'document'}.docx`}
                    onReset={reset}
                    message="Your Word document is ready! Layout, images, and editable text have been preserved."
                />
            )}
        </div>
    );
}
