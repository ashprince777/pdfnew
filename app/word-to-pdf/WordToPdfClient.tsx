"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { FileText, ArrowRight } from 'lucide-react';
import { PDFDocument, rgb } from '@cantoo/pdf-lib';
import JSZip from 'jszip';
import { ToolHeader, ToolWorkspace, SelectedFile, PrimaryAction, Notice } from '@/components/ToolUI';
import { baseName, embedUnicodeFont, pdfBytesToBlob, PdfToolError, toDrawableText, wrapText } from '@/lib/pdf';
import { useToolRunner } from '@/lib/useToolRunner';

const RENDER_SCALE = 2;

interface SectionGeometry {
    width: number;
    height: number;
    pageHeight: number;
    padTop: number;
    padBottom: number;
    /** Where body content ends (above the footer / bottom margin). */
    contentEnd: number;
}

function measureSection(section: HTMLElement): SectionGeometry {
    const style = getComputedStyle(section);
    const width = section.offsetWidth;
    const height = section.scrollHeight;
    // docx-preview sets min-height to the page height and padding to the page margins.
    const pageHeight = parseFloat(style.minHeight) || width * (11 / 8.5);
    const padTop = parseFloat(style.paddingTop) || 0;
    const padBottom = parseFloat(style.paddingBottom) || 0;
    const footer = section.querySelector('footer');
    const footerTop = footer ? footer.getBoundingClientRect().top - section.getBoundingClientRect().top : height - padBottom;
    return { width, height, pageHeight, padTop, padBottom, contentEnd: Math.max(padTop + 1, Math.min(height, footerTop)) };
}

/**
 * Finds the lowest pixel row at or above the bottom of the canvas that contains (almost)
 * no ink, i.e. the gap between two text lines or table rows, so a page break never slices
 * through text. Thin vertical table borders are tolerated. Returns null if none is found
 * below `minRow` (e.g. a tall image), in which case the caller cuts at the limit.
 */
function findBlankRow(canvas: HTMLCanvasElement, minRow: number): number | null {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    const tolerance = Math.max(2, Math.round(width * 0.01));
    for (let y = height - 1; y >= Math.max(0, minRow); y--) {
        let ink = 0;
        for (let x = 0, i = y * width * 4; x < width; x++, i += 4) {
            if (data[i] + data[i + 1] + data[i + 2] < 690 && ++ink > tolerance) break;
        }
        if (ink <= tolerance) return y;
    }
    return null;
}

export default function WordToPdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const tool = useToolRunner();
    const setProgress = tool.setProgress;

    // High fidelity converter: docx-preview lays the document out as HTML, html2canvas
    // captures it page by page.
    const convertWithDocxPreview = async (arrayBuffer: ArrayBuffer): Promise<Uint8Array | null> => {
        try {
            const { renderAsync, defaultOptions } = await import('docx-preview');
            const html2canvasModule = await import('html2canvas');
            const html2canvas = html2canvasModule.default || html2canvasModule;

            // Off-screen container
            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.top = '-99999px';
            container.style.left = '-99999px';
            container.style.backgroundColor = '#ffffff';
            container.style.zIndex = '-1000';
            document.body.appendChild(container);

            try {
                setProgress('Rendering document layout...');
                await renderAsync(arrayBuffer, container, undefined, {
                    ...defaultOptions,
                    inWrapper: true,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    breakPages: true,
                    // Honour the page breaks Word stored when the file was last saved.
                    ignoreLastRenderedPageBreak: false,
                    renderHeaders: true,
                    renderFooters: true,
                });

                // Let images and fonts finish loading before measuring.
                await document.fonts?.ready;
                await new Promise((r) => setTimeout(r, 250));

                const sections = Array.from(container.querySelectorAll<HTMLElement>('.docx-wrapper > section'));
                if (sections.length === 0) return null;

                // docx-preview only starts a new <section> at explicit page/section breaks, so one
                // section can hold many pages of text. Render it page by page, breaking in the
                // whitespace between lines.
                const pdfDoc = await PDFDocument.create();
                const capture = (section: HTMLElement, from: number, height: number) =>
                    html2canvas(section, {
                        scale: RENDER_SCALE,
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff',
                        // Crop to this page's slice. html2canvas adds x/y to the element's own position.
                        x: 0,
                        y: from,
                        width: section.offsetWidth,
                        height,
                    });

                for (const section of sections) {
                    const geo = measureSection(section);
                    const contentHeight = geo.pageHeight - geo.padTop - geo.padBottom;
                    const singlePage = geo.height <= geo.pageHeight + 2;
                    let pos = geo.padTop;
                    let first = true;

                    while (first || pos < geo.contentEnd - 1) {
                        setProgress(`Rendering page ${pdfDoc.getPageCount() + 1}...`);
                        // The first page includes the top margin/header; later pages continue at `pos`.
                        const from = first ? 0 : pos;
                        const limit = singlePage ? geo.height : Math.min(pos + contentHeight, geo.contentEnd);
                        const canvas = await capture(section, from, Math.max(1, limit - from));

                        let cutRow = canvas.height;
                        if (!singlePage && limit < geo.contentEnd) {
                            const minRow = Math.round((pos - from + contentHeight * 0.6) * RENDER_SCALE);
                            cutRow = findBlankRow(canvas, minRow) ?? canvas.height;
                        }
                        const pageImage = document.createElement('canvas');
                        pageImage.width = canvas.width;
                        pageImage.height = Math.max(1, cutRow);
                        pageImage.getContext('2d')?.drawImage(canvas, 0, 0);
                        canvas.width = canvas.height = 0;

                        const img = await pdfDoc.embedJpg(pageImage.toDataURL('image/jpeg', 0.92));
                        const sliceHeightPx = pageImage.height / RENDER_SCALE;
                        pageImage.width = pageImage.height = 0;

                        // 1 CSS px = 0.75 pt
                        const pageWidthPt = geo.width * 0.75;
                        const pageHeightPt = geo.pageHeight * 0.75;
                        const offsetTopPt = (first ? 0 : geo.padTop) * 0.75;
                        const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
                        page.drawImage(img, {
                            x: 0,
                            y: pageHeightPt - offsetTopPt - sliceHeightPx * 0.75,
                            width: pageWidthPt,
                            height: sliceHeightPx * 0.75,
                        });

                        if (singlePage) break;
                        pos = from + sliceHeightPx;
                        first = false;
                    }
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
        const font = await embedUnicodeFont(pdfDoc, 'regular');
        const boldFont = await embedUnicodeFont(pdfDoc, 'bold');
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
            const currentFont = isBold ? boldFont : font;
            for (const line of wrapText(currentFont, toDrawableText(currentFont, text), fontSize, maxWidth)) {
                checkPageBreak(lineHeight);
                if (line) page.drawText(line, { x: margin, y: yPos, size: fontSize, font: currentFont, color: rgb(0.1, 0.1, 0.1) });
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

    const convertToPdf = () => {
        if (!file) return;
        tool.run(async () => {
            setProgress('Reading Word document...');
            const arrayBuffer = await file.arrayBuffer();

            // Legacy binary .doc (OLE compound file) cannot be parsed in the browser.
            const header = new Uint8Array(arrayBuffer.slice(0, 4));
            if (header[0] === 0xd0 && header[1] === 0xcf && header[2] === 0x11 && header[3] === 0xe0) {
                throw new PdfToolError('This is an older Word 97-2003 (.doc) file. Open it in Word and use "Save As" → Word Document (.docx), then convert it here.');
            }
            if (!(header[0] === 0x50 && header[1] === 0x4b)) {
                throw new PdfToolError('This file is not a valid Word (.docx) document.');
            }

            // Step 1: high-fidelity rendering with docx-preview + html2canvas.
            // Step 2: fall back to the XML structure parser if rendering is not possible.
            const pdfBytes = (await convertWithDocxPreview(arrayBuffer)) ?? (await convertWithXmlFallback(arrayBuffer));
            return { blob: pdfBytesToBlob(pdfBytes), filename: `${baseName(file.name)}.pdf` };
        }, 'Error converting file. Please ensure it is a valid .docx file.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
    };

    return (
        <div className="container">
            <ToolHeader title="Word to PDF" subtitle="Convert your Word documents (DOCX) to PDF with formatting, tables, and images." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={(files) => setFile(files[0] ?? null)} accept=".docx,.doc" />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace>
                    <SelectedFile file={file} onRemove={reset} icon={FileText} />
                    <Notice>Pages are rendered exactly as laid out in the document. Fonts not installed on your device are substituted.</Notice>
                    <PrimaryAction onClick={convertToPdf}>
                        Convert to PDF <ArrowRight size={22} />
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status={tool.progress || 'Converting Word to PDF...'} />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="Your PDF document is ready!"
                />
            )}
        </div>
    );
}
