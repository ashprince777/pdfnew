"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { Presentation, ArrowRight } from 'lucide-react';
import { PDFDocument } from '@cantoo/pdf-lib';
import JSZip from 'jszip';
import { ToolHeader, ToolWorkspace, SelectedFile, PrimaryAction, Notice } from '@/components/ToolUI';
import { baseName, pdfBytesToBlob, PdfToolError } from '@/lib/pdf';
import { useToolRunner } from '@/lib/useToolRunner';

interface SlideElement {
    type: 'shape' | 'image' | 'table';
    x: number;
    y: number;
    w: number;
    h: number;
    fillColor?: string;
    borderRadius?: string;
    borderColor?: string;
    borderWidth?: number;
    paragraphs?: {
        align?: string;
        runs: {
            text: string;
            fontSize?: number;
            bold?: boolean;
            italic?: boolean;
            color?: string;
        }[];
    }[];
    imageDataUrl?: string;
    tableRows?: {
        cells: {
            text: string;
            fillColor?: string;
            bold?: boolean;
        }[];
    }[];
}

interface ParsedSlide {
    width: number;
    height: number;
    bgColor: string;
    bgImage?: string;
    elements: SlideElement[];
    rawTexts: string[];
}

export default function PowerpointToPdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const tool = useToolRunner();
    const setProgress = tool.setProgress;

    const parsePptx = async (fileData: ArrayBuffer): Promise<ParsedSlide[]> => {
        const zip = await JSZip.loadAsync(fileData);

        // 1. Get slide dimensions from ppt/presentation.xml
        let slideWidth = 960; // default 16:9 widescreen points
        let slideHeight = 540;

        const presXmlFile = zip.file('ppt/presentation.xml');
        if (presXmlFile) {
            const presXmlText = await presXmlFile.async('text');
            const parser = new DOMParser();
            const presDoc = parser.parseFromString(presXmlText, 'application/xml');
            const sldSz = presDoc.getElementsByTagName('p:sldSz')[0];
            if (sldSz) {
                const cx = parseInt(sldSz.getAttribute('cx') || '12192000', 10);
                const cy = parseInt(sldSz.getAttribute('cy') || '6858000', 10);
                if (cx && cy) {
                    slideWidth = Math.round(cx / 12700);
                    slideHeight = Math.round(cy / 12700);
                }
            }
        }

        const slides: ParsedSlide[] = [];
        let slideNum = 1;

        while (true) {
            const slideFile = zip.file(`ppt/slides/slide${slideNum}.xml`);
            if (!slideFile) break;

            const slideXmlText = await slideFile.async('text');
            const parser = new DOMParser();
            const slideDoc = parser.parseFromString(slideXmlText, 'application/xml');

            // 2. Parse media relationships for this slide
            const mediaMap: Record<string, string> = {};
            const relsFile = zip.file(`ppt/slides/_rels/slide${slideNum}.xml.rels`);
            if (relsFile) {
                const relsText = await relsFile.async('text');
                const relsDoc = parser.parseFromString(relsText, 'application/xml');
                const relationships = relsDoc.getElementsByTagName('Relationship');

                for (let r = 0; r < relationships.length; r++) {
                    const id = relationships[r].getAttribute('Id');
                    let target = relationships[r].getAttribute('Target') || '';
                    if (id && target) {
                        // Normalize target path (e.g. "../media/image1.png" -> "ppt/media/image1.png")
                        if (target.startsWith('../')) {
                            target = 'ppt/' + target.replace(/^\.\.\//, '');
                        } else if (!target.startsWith('ppt/')) {
                            target = 'ppt/slides/' + target;
                        }

                        const mediaFile = zip.file(target);
                        if (mediaFile) {
                            const base64Data = await mediaFile.async('base64');
                            const ext = target.split('.').pop()?.toLowerCase() || 'png';
                            const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : 'image/png';
                            mediaMap[id] = `data:${mime};base64,${base64Data}`;
                        }
                    }
                }
            }

            // 3. Detect slide background
            let bgColor = '#ffffff';
            let bgImage: string | undefined = undefined;

            const bgEl = slideDoc.getElementsByTagName('p:bg')[0];
            if (bgEl) {
                const srgb = bgEl.getElementsByTagName('a:srgbClr')[0];
                if (srgb && srgb.getAttribute('val')) {
                    bgColor = `#${srgb.getAttribute('val')}`;
                }
                const blip = bgEl.getElementsByTagName('a:blip')[0];
                if (blip) {
                    const embedId = blip.getAttribute('r:embed');
                    if (embedId && mediaMap[embedId]) {
                        bgImage = mediaMap[embedId];
                    }
                }
            }

            // Helper to parse color
            const extractColor = (parent: Element | null): string | undefined => {
                if (!parent) return undefined;
                const srgb = parent.getElementsByTagName('a:srgbClr')[0];
                if (srgb && srgb.getAttribute('val')) {
                    return `#${srgb.getAttribute('val')}`;
                }
                const scheme = parent.getElementsByTagName('a:schemeClr')[0];
                if (scheme) {
                    const val = scheme.getAttribute('val');
                    if (val === 'lt1' || val === 'bg1') return '#ffffff';
                    if (val === 'dk1' || val === 'tx1') return '#0f172a';
                    if (val?.startsWith('accent')) return '#3b82f6';
                }
                return undefined;
            };

            // 4. Parse shape elements
            const elements: SlideElement[] = [];
            const rawTexts: string[] = [];

            const spTree = slideDoc.getElementsByTagName('p:spTree')[0];
            if (spTree) {
                const children = Array.from(spTree.childNodes);

                for (const child of children) {
                    if (child.nodeType !== Node.ELEMENT_NODE) continue;
                    const el = child as Element;
                    const tagName = el.tagName.toLowerCase();

                    // Read coordinates (a:xfrm)
                    const xfrm = el.getElementsByTagName('a:xfrm')[0];
                    let x = 0, y = 0, w = 100, h = 100;
                    if (xfrm) {
                        const off = xfrm.getElementsByTagName('a:off')[0];
                        const ext = xfrm.getElementsByTagName('a:ext')[0];
                        if (off) {
                            x = Math.round(parseInt(off.getAttribute('x') || '0', 10) / 12700);
                            y = Math.round(parseInt(off.getAttribute('y') || '0', 10) / 12700);
                        }
                        if (ext) {
                            w = Math.round(parseInt(ext.getAttribute('cx') || '0', 10) / 12700);
                            h = Math.round(parseInt(ext.getAttribute('cy') || '0', 10) / 12700);
                        }
                    }

                    // A) PICTURE / IMAGE (p:pic)
                    if (tagName === 'p:pic') {
                        const blip = el.getElementsByTagName('a:blip')[0];
                        const embedId = blip?.getAttribute('r:embed');
                        if (embedId && mediaMap[embedId]) {
                            elements.push({
                                type: 'image',
                                x,
                                y,
                                w,
                                h,
                                imageDataUrl: mediaMap[embedId],
                            });
                        }
                        continue;
                    }

                    // B) SHAPES & TEXTBOXES (p:sp)
                    if (tagName === 'p:sp') {
                        const spPr = el.getElementsByTagName('p:spPr')[0];
                        const solidFill = spPr?.getElementsByTagName('a:solidFill')[0];
                        const fillColor = extractColor(solidFill);

                        // Geometry (check if rounded card)
                        const prstGeom = spPr?.getElementsByTagName('a:prstGeom')[0];
                        const geomType = prstGeom?.getAttribute('prst');
                        let borderRadius: string | undefined = undefined;
                        if (geomType === 'roundRect') {
                            borderRadius = '16px';
                        } else if (geomType === 'ellipse') {
                            borderRadius = '50%';
                        }

                        // Border
                        const ln = spPr?.getElementsByTagName('a:ln')[0];
                        let borderColor: string | undefined = undefined;
                        let borderWidth: number | undefined = undefined;
                        if (ln) {
                            const lnFill = ln.getElementsByTagName('a:solidFill')[0];
                            borderColor = extractColor(lnFill);
                            const wVal = ln.getAttribute('w');
                            if (wVal) borderWidth = Math.max(1, Math.round(parseInt(wVal, 10) / 12700));
                        }

                        // Check if this shape is actually a full-slide background rectangle
                        if (x <= 5 && y <= 5 && w >= slideWidth * 0.95 && h >= slideHeight * 0.95 && fillColor) {
                            bgColor = fillColor;
                        }

                        // Text body
                        const txBody = el.getElementsByTagName('p:txBody')[0];
                        const paragraphs: SlideElement['paragraphs'] = [];

                        if (txBody) {
                            const pElements = txBody.getElementsByTagName('a:p');
                            for (let pIdx = 0; pIdx < pElements.length; pIdx++) {
                                const pEl = pElements[pIdx];
                                const pPr = pEl.getElementsByTagName('a:pPr')[0];
                                const algn = pPr?.getAttribute('algn');
                                const align = algn === 'ctr' ? 'center' : algn === 'r' ? 'right' : algn === 'just' ? 'justify' : 'left';

                                const runs: NonNullable<SlideElement['paragraphs']>[0]['runs'] = [];
                                const childNodes = Array.from(pEl.childNodes);

                                for (const pChild of childNodes) {
                                    if (pChild.nodeType !== Node.ELEMENT_NODE) continue;
                                    const pChildEl = pChild as Element;

                                    if (pChildEl.tagName.toLowerCase() === 'a:r') {
                                        const rPr = pChildEl.getElementsByTagName('a:rPr')[0];
                                        const tEl = pChildEl.getElementsByTagName('a:t')[0];
                                        const text = tEl?.textContent || '';
                                        if (text) {
                                            rawTexts.push(text);
                                            const sz = rPr?.getAttribute('sz');
                                            const fontSize = sz ? Math.max(10, Math.round(parseInt(sz, 10) / 100)) : 14;
                                            const bold = rPr?.getAttribute('b') === '1';
                                            const italic = rPr?.getAttribute('i') === '1';
                                            const textColor = extractColor(rPr);

                                            runs.push({
                                                text,
                                                fontSize,
                                                bold,
                                                italic,
                                                color: textColor,
                                            });
                                        }
                                    }
                                }

                                if (runs.length > 0) {
                                    paragraphs.push({ align, runs });
                                }
                            }
                        }

                        if (fillColor || (paragraphs && paragraphs.length > 0)) {
                            elements.push({
                                type: 'shape',
                                x,
                                y,
                                w,
                                h,
                                fillColor,
                                borderRadius,
                                borderColor,
                                borderWidth,
                                paragraphs: paragraphs.length > 0 ? paragraphs : undefined,
                            });
                        }
                        continue;
                    }

                    // C) TABLES (p:graphicFrame)
                    if (tagName === 'p:graphicFrame') {
                        const tbl = el.getElementsByTagName('a:tbl')[0];
                        if (tbl) {
                            const trList = tbl.getElementsByTagName('a:tr');
                            const tableRows: NonNullable<SlideElement['tableRows']> = [];

                            for (let r = 0; r < trList.length; r++) {
                                const tcList = trList[r].getElementsByTagName('a:tc');
                                const cells: NonNullable<SlideElement['tableRows']>[0]['cells'] = [];

                                for (let c = 0; c < tcList.length; c++) {
                                    const tc = tcList[c];
                                    const cellText = tc.textContent?.trim() || '';
                                    if (cellText) rawTexts.push(cellText);

                                    const tcPr = tc.getElementsByTagName('a:tcPr')[0];
                                    const cellFill = extractColor(tcPr?.getElementsByTagName('a:solidFill')[0]);
                                    cells.push({
                                        text: cellText,
                                        fillColor: cellFill,
                                        bold: r === 0,
                                    });
                                }
                                tableRows.push({ cells });
                            }

                            elements.push({
                                type: 'table',
                                x,
                                y,
                                w,
                                h,
                                tableRows,
                            });
                        }
                    }
                }
            }

            // Auto-detect dark background if many text runs are explicitly white or light
            let whiteTextCount = 0;
            let darkTextCount = 0;
            for (const el of elements) {
                if (el.paragraphs) {
                    for (const p of el.paragraphs) {
                        for (const r of p.runs) {
                            if (r.color === '#ffffff' || r.color?.toLowerCase() === '#fff') {
                                whiteTextCount++;
                            } else if (r.color === '#0f172a' || r.color === '#000000') {
                                darkTextCount++;
                            }
                        }
                    }
                }
            }

            if (whiteTextCount > darkTextCount && bgColor === '#ffffff') {
                // If text is predominantly white, background was theme-dark (e.g. #111625)
                bgColor = '#111625';
            }

            slides.push({
                width: slideWidth,
                height: slideHeight,
                bgColor,
                bgImage,
                elements,
                rawTexts,
            });

            slideNum++;
        }

        return slides;
    };

    const convertToPdf = () => {
        if (!file) return;
        tool.run(async () => {
            setProgress('Analyzing presentation slides...');
            const html2canvasModule = await import('html2canvas');
            const html2canvas = html2canvasModule.default || html2canvasModule;

            const arrayBuffer = await file.arrayBuffer();
            const header = new Uint8Array(arrayBuffer.slice(0, 4));
            if (header[0] === 0xd0 && header[1] === 0xcf && header[2] === 0x11 && header[3] === 0xe0) {
                throw new PdfToolError('This is an older PowerPoint 97-2003 (.ppt) file. Open it in PowerPoint and use "Save As" → PowerPoint Presentation (.pptx), then convert it here.');
            }
            if (!(header[0] === 0x50 && header[1] === 0x4b)) {
                throw new PdfToolError('This file is not a valid PowerPoint (.pptx) presentation.');
            }
            const parsedSlides = await parsePptx(arrayBuffer);
            if (parsedSlides.length === 0) throw new PdfToolError('No slides found in this presentation.');

            const pdfDoc = await PDFDocument.create();

            // Render each slide visually
            for (let i = 0; i < parsedSlides.length; i++) {
                setProgress(`Rendering slide ${i + 1} of ${parsedSlides.length}...`);
                const slide = parsedSlides[i];

                // Create offscreen slide element
                const slideContainer = document.createElement('div');
                slideContainer.style.position = 'fixed';
                slideContainer.style.top = '-99999px';
                slideContainer.style.left = '-99999px';
                slideContainer.style.width = `${slide.width}px`;
                slideContainer.style.height = `${slide.height}px`;
                slideContainer.style.backgroundColor = slide.bgColor;
                if (slide.bgImage) {
                    slideContainer.style.backgroundImage = `url(${slide.bgImage})`;
                    slideContainer.style.backgroundSize = 'cover';
                    slideContainer.style.backgroundPosition = 'center';
                }
                slideContainer.style.overflow = 'hidden';
                slideContainer.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                slideContainer.style.boxSizing = 'border-box';
                slideContainer.style.zIndex = '-2000';

                // Determine default text color for slide
                const isDarkBg = slide.bgColor.toLowerCase() === '#111625' || slide.bgColor.startsWith('#0') || slide.bgColor.startsWith('#1');
                const defaultTextColor = isDarkBg ? '#ffffff' : '#1e293b';

                // Add elements in z-order
                for (const el of slide.elements) {
                    const elDiv = document.createElement('div');
                    elDiv.style.position = 'absolute';
                    elDiv.style.left = `${el.x}px`;
                    elDiv.style.top = `${el.y}px`;
                    elDiv.style.width = `${Math.max(20, el.w)}px`;
                    elDiv.style.height = `${Math.max(20, el.h)}px`;
                    elDiv.style.boxSizing = 'border-box';

                    if (el.fillColor) {
                        elDiv.style.backgroundColor = el.fillColor;
                    }
                    if (el.borderRadius) {
                        elDiv.style.borderRadius = el.borderRadius;
                    }
                    if (el.borderColor) {
                        elDiv.style.border = `${el.borderWidth || 1}px solid ${el.borderColor}`;
                    }

                    // Render Image
                    if (el.type === 'image' && el.imageDataUrl) {
                        const img = document.createElement('img');
                        img.src = el.imageDataUrl;
                        img.style.width = '100%';
                        img.style.height = '100%';
                        img.style.objectFit = 'contain';
                        if (el.borderRadius) img.style.borderRadius = el.borderRadius;
                        elDiv.appendChild(img);
                    }

                    // Render Text
                    if (el.paragraphs && el.paragraphs.length > 0) {
                        elDiv.style.display = 'flex';
                        elDiv.style.flexDirection = 'column';
                        elDiv.style.justifyContent = 'flex-start';
                        elDiv.style.padding = el.fillColor ? '14px 18px' : '4px 6px';

                        for (const p of el.paragraphs) {
                            const pDiv = document.createElement('div');
                            pDiv.style.textAlign = p.align || 'left';
                            pDiv.style.lineHeight = '1.35';
                            pDiv.style.marginBottom = '4px';

                            for (const r of p.runs) {
                                const span = document.createElement('span');
                                span.textContent = r.text;
                                span.style.fontSize = `${r.fontSize || 15}px`;
                                if (r.bold) span.style.fontWeight = 'bold';
                                if (r.italic) span.style.fontStyle = 'italic';
                                span.style.color = r.color || defaultTextColor;
                                pDiv.appendChild(span);
                            }
                            elDiv.appendChild(pDiv);
                        }
                    }

                    // Render Table
                    if (el.type === 'table' && el.tableRows) {
                        const table = document.createElement('table');
                        table.style.width = '100%';
                        table.style.height = '100%';
                        table.style.borderCollapse = 'collapse';

                        for (const r of el.tableRows) {
                            const tr = document.createElement('tr');
                            for (const c of r.cells) {
                                const td = document.createElement(c.bold ? 'th' : 'td');
                                td.textContent = c.text;
                                td.style.border = '1px solid rgba(150, 150, 150, 0.4)';
                                td.style.padding = '6px 10px';
                                td.style.fontSize = '13px';
                                td.style.color = defaultTextColor;
                                if (c.fillColor) td.style.backgroundColor = c.fillColor;
                                if (c.bold) td.style.fontWeight = 'bold';
                                tr.appendChild(td);
                            }
                            table.appendChild(tr);
                        }
                        elDiv.appendChild(table);
                    }

                    slideContainer.appendChild(elDiv);
                }

                document.body.appendChild(slideContainer);

                try {
                    // Capture high-DPI canvas
                    const canvas = await html2canvas(slideContainer, {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        backgroundColor: slide.bgColor,
                    });

                    const imgData = canvas.toDataURL('image/jpeg', 0.95);
                    const img = await pdfDoc.embedJpg(imgData);

                    const page = pdfDoc.addPage([slide.width, slide.height]);
                    page.drawImage(img, {
                        x: 0,
                        y: 0,
                        width: slide.width,
                        height: slide.height,
                    });
                } finally {
                    document.body.removeChild(slideContainer);
                }
            }

            setProgress('Finalizing PDF presentation...');
            return { blob: pdfBytesToBlob(await pdfDoc.save()), filename: `${baseName(file.name)}.pdf` };
        }, 'Error converting the PowerPoint file. Please check the file.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
    };

    return (
        <div className="container">
            <ToolHeader title="PowerPoint to PDF" subtitle="Convert your PowerPoint presentations (PPTX) to PDF with backgrounds, shapes, images and text." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={(files) => setFile(files[0] ?? null)} accept=".pptx,.ppt" />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace>
                    <SelectedFile file={file} onRemove={reset} icon={Presentation} />
                    <Notice>Slides are rebuilt in your browser. Text, shapes, tables and images are supported; charts, SmartArt and animations are not.</Notice>
                    <PrimaryAction onClick={convertToPdf}>
                        Convert to PDF <ArrowRight size={22} />
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status={tool.progress || 'Converting PowerPoint to PDF...'} />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="Your presentation PDF is ready!"
                />
            )}
        </div>
    );
}
