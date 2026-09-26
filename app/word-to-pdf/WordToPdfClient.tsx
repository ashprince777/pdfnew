"use client";
import { useState, useRef } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { FileText, ArrowRight, Trash2 } from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';

export default function WordToPdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [progress, setProgress] = useState('Converting Word to PDF...');
    const containerRef = useRef<HTMLDivElement>(null);

    const handleFilesSelected = (newFiles: File[]) => {
        if (newFiles.length > 0) {
            setFile(newFiles[0]);
        }
    };

    const removeFile = () => {
        setFile(null);
    };

    // Sanitize text to avoid WinAnsi crashes in pdf-lib
    const sanitizeTextForPdf = (str: string): string => {
        return str
            .replace(/[\u201C\u201D]/g, '"') // curly double quotes
            .replace(/[\u2018\u2019\u201A\u0060\u00B4]/g, "'") // curly single quotes
            .replace(/[\u2013\u2014\u2015]/g, '-') // em / en dash
            .replace(/[\u2022\u25CF\u00B7]/g, '* ') // bullet points
            .replace(/\u2026/g, '...') // ellipsis
            .replace(/[\u20B9]/g, 'Rs. ') // Indian rupee
            .replace(/[\u20AC]/g, 'EUR ') // Euro
            .replace(/[\u00A3]/g, 'GBP ') // Pound
            .replace(/[\u00A5]/g, 'JPY ') // Yen
            .replace(/\t/g, '    ')
            .replace(/[^\x00-\x7F]/g, (char) => {
                const code = char.charCodeAt(0);
                if (code >= 32 && code <= 255) return char;
                return ' ';
            });
    };

    // High fidelity converter using docx-preview and html2canvas
    const convertWithDocxPreview = async (arrayBuffer: ArrayBuffer): Promise<Uint8Array | null> => {
        try {
            const { renderAsync, defaultOptions } = await import('docx-preview');
            const html2canvasModule = await import('html2canvas');
            const html2canvas = html2canvasModule.default || html2canvasModule;

            // Create offscreen container
            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.top = '-99999px';
            container.style.left = '-99999px';
            container.style.width = '900px';
            container.style.backgroundColor = '#ffffff';
            container.style.zIndex = '-1000';
            document.body.appendChild(container);

            try {
                setProgress('Rendering document layout & pages...');
                await renderAsync(arrayBuffer, container, undefined, {
                    ...defaultOptions,
                    inWrapper: true,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    breakPages: true,
                    renderHeaders: true,
                    renderFooters: true,
                });

                // Small delay to let images and fonts finish rendering
                await new Promise((r) => setTimeout(r, 250));

                // Find rendered pages (.docx-wrapper > section.docx or any .docx page sections)
                const sections = Array.from(container.querySelectorAll<HTMLElement>('section.docx, .docx-wrapper > section, .docx'));

                if (sections.length === 0) {
                    return null;
                }

                const pdfDoc = await PDFDocument.create();

                for (let i = 0; i < sections.length; i++) {
                    setProgress(`Rendering page ${i + 1} of ${sections.length}...`);
                    const section = sections[i];

                    // Render with high quality (scale 2)
                    const canvas = await html2canvas(section, {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff',
                    });

                    const imgData = canvas.toDataURL('image/jpeg', 0.95);
                    const img = await pdfDoc.embedJpg(imgData);

                    // Dimensions in points: 1 CSS px = 72/96 pt = 0.75 pt
                    const widthPx = section.offsetWidth || 816;
                    const heightPx = section.offsetHeight || 1056;
                    const widthPt = (widthPx / 96) * 72;
                    const heightPt = (heightPx / 96) * 72;

                    const page = pdfDoc.addPage([widthPt, heightPt]);
                    page.drawImage(img, {
                        x: 0,
                        y: 0,
                        width: widthPt,
                        height: heightPt,
                    });
                }

                setProgress('Saving PDF document...');
                return await pdfDoc.save();
            } finally {
                document.body.removeChild(container);
            }
        } catch (err) {
            console.warn('docx-preview high-fidelity rendering encountered an issue, falling back to direct XML extraction:', err);
            return null;
        }
    };

    // Resilient fallback parser: extracts paragraphs & tables from document.xml safely
    const convertWithXmlFallback = async (arrayBuffer: ArrayBuffer): Promise<Uint8Array> => {
        setProgress('Processing document content...');
        const zip = await JSZip.loadAsync(arrayBuffer);
        const docXml = zip.file('word/document.xml');
        if (!docXml) {
            throw new Error('Invalid Word document: word/document.xml not found.');
        }

        const xmlText = await docXml.async('text');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontSize = 11;
        const lineHeight = fontSize * 1.45;
        const margin = 45;
        const pageWidth = 595.28; // A4
        const pageHeight = 841.89;
        const maxWidth = pageWidth - margin * 2;

        let page = pdfDoc.addPage([pageWidth, pageHeight]);
        let yPos = pageHeight - margin;

        const checkPageBreak = (needed: number) => {
            if (yPos - needed < margin) {
                page = pdfDoc.addPage([pageWidth, pageHeight]);
                yPos = pageHeight - margin;
            }
        };

        const drawLine = (text: string, isBold = false) => {
            const sanitized = sanitizeTextForPdf(text);
            const currentFont = isBold ? boldFont : font;
            const words = sanitized.split(' ');
            let currentLine = '';

            for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                let textWidth = 0;
                try {
                    textWidth = currentFont.widthOfTextAtSize(testLine, fontSize);
                } catch {
                    textWidth = testLine.length * 6;
                }

                if (textWidth > maxWidth && currentLine) {
                    checkPageBreak(lineHeight);
                    page.drawText(currentLine, {
                        x: margin,
                        y: yPos,
                        size: fontSize,
                        font: currentFont,
                        color: rgb(0.1, 0.1, 0.1),
                    });
                    yPos -= lineHeight;
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }

            if (currentLine) {
                checkPageBreak(lineHeight);
                page.drawText(currentLine, {
                    x: margin,
                    y: yPos,
                    size: fontSize,
                    font: currentFont,
                    color: rgb(0.1, 0.1, 0.1),
                });
                yPos -= lineHeight;
            }
        };

        // Extract paragraphs and tables sequentially
        const body = xmlDoc.getElementsByTagName('w:body')[0] || xmlDoc.documentElement;
        const children = Array.from(body.childNodes);

        for (const node of children) {
            const nodeName = node.nodeName.toLowerCase();

            if (nodeName === 'w:p') {
                const tElements = (node as Element).getElementsByTagName('w:t');
                let paraText = '';
                for (let j = 0; j < tElements.length; j++) {
                    paraText += tElements[j].textContent || '';
                }
                if (paraText.trim()) {
                    const isBold = (node as Element).getElementsByTagName('w:b').length > 0;
                    drawLine(paraText, isBold);
                    yPos -= lineHeight * 0.25;
                } else {
                    yPos -= lineHeight * 0.4;
                }
            } else if (nodeName === 'w:tbl') {
                // Table support (e.g. for bank statements, invoices)
                const rows = (node as Element).getElementsByTagName('w:tr');
                for (let r = 0; r < rows.length; r++) {
                    const cells = rows[r].getElementsByTagName('w:tc');
                    const cellTexts: string[] = [];
                    for (let c = 0; c < cells.length; c++) {
                        const texts = cells[c].getElementsByTagName('w:t');
                        let cellContent = '';
                        for (let t = 0; t < texts.length; t++) {
                            cellContent += texts[t].textContent || '';
                        }
                        cellTexts.push(cellContent.trim());
                    }

                    if (cellTexts.some((txt) => txt.length > 0)) {
                        const isHeader = r === 0;
                        const rowLine = cellTexts.filter(Boolean).join('  |  ');
                        drawLine(rowLine, isHeader);
                    }
                }
                yPos -= lineHeight * 0.5;
            }
        }

        return await pdfDoc.save();
    };

    const convertToPdf = async () => {
        if (!file) return;

        setStatus('PROCESSING');
        setProgress('Reading Word document...');

        try {
            const arrayBuffer = await file.arrayBuffer();

            // Check if it's legacy binary .doc format
            const headerBytes = new Uint8Array(arrayBuffer.slice(0, 4));
            const isDocBinary = headerBytes[0] === 0xd0 && headerBytes[1] === 0xcf && headerBytes[2] === 0x11 && headerBytes[3] === 0xe0;

            if (isDocBinary) {
                alert("This file is in the older Word 97-2003 (.doc) binary format. Please open it in Microsoft Word and save it as a modern Word Document (.docx) for full conversion support.");
                setStatus('IDLE');
                return;
            }

            // Step 1: Attempt high-fidelity rendering with docx-preview + html2canvas
            let pdfBytes = await convertWithDocxPreview(arrayBuffer);

            // Step 2: Fall back to XML structure parser if preview isn't applicable
            if (!pdfBytes) {
                pdfBytes = await convertWithXmlFallback(arrayBuffer);
            }

            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

            if (downloadUrl) URL.revokeObjectURL(downloadUrl);
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error: any) {
            console.error("Error generating PDF:", error);
            alert("Error converting file: " + (error?.message || "Please ensure it is a valid .docx file."));
            setStatus('IDLE');
        }
    };

    const reset = () => {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setFile(null);
        setStatus('IDLE');
        setDownloadUrl(null);
        setProgress('Converting Word to PDF...');
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1 className="text-4xl font-bold mb-4">Word to PDF</h1>
                <p className="text-muted mb-8 text-lg">Convert your Word documents (DOCX) to PDF with accurate formatting, tables, and images.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} multiple={false} accept=".docx,.doc" />
            )}

            {status === 'IDLE' && file && (
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-100 p-3 rounded-lg">
                                <FileText className="text-blue-600 w-8 h-8" />
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
                            onClick={convertToPdf}
                            className="btn btn-primary btn-lg flex items-center gap-2 px-8 py-4 text-xl"
                        >
                            Convert to PDF <ArrowRight size={24} />
                        </button>
                    </div>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status={progress} />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={`${file?.name ? file.name.replace(/\.[^/.]+$/, '') : 'document'}.pdf`}
                    onReset={reset}
                    message="Your PDF document is ready!"
                />
            )}
        </div>
    );
}
