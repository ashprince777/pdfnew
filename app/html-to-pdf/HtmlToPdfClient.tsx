"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { Code, ArrowRight, Trash2, FileText } from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export default function HtmlToPdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const [htmlText, setHtmlText] = useState('');
    const [mode, setMode] = useState<'upload' | 'paste'>('upload');
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [outputFilename, setOutputFilename] = useState('document.pdf');

    const handleFilesSelected = (newFiles: File[]) => {
        if (newFiles.length > 0) {
            setFile(newFiles[0]);
        }
    };

    const removeFile = () => {
        setFile(null);
    };

    const convertHtmlToPdf = async () => {
        let contentToParse = '';
        let filename = 'converted_document.pdf';

        if (mode === 'upload') {
            if (!file) return;
            contentToParse = await file.text();
            filename = `${file.name.replace(/\.[^/.]+$/, '')}.pdf`;
        } else {
            if (!htmlText.trim()) {
                alert('Please enter or paste HTML code.');
                return;
            }
            contentToParse = htmlText;
            filename = 'pasted_html.pdf';
        }

        setStatus('PROCESSING');
        setOutputFilename(filename);

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(contentToParse, 'text/html');

            const pdfDoc = await PDFDocument.create();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const codeFont = await pdfDoc.embedFont(StandardFonts.Courier);

            const pageWidth = 595.28; // A4
            const pageHeight = 841.89;
            const margin = 50;
            const maxWidth = pageWidth - margin * 2;

            let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            let yPos = pageHeight - margin;

            const checkNewPage = (neededSpace: number) => {
                if (yPos - neededSpace < margin) {
                    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
                    yPos = pageHeight - margin;
                }
            };

            const drawWrappedText = (
                text: string,
                fontSize: number,
                selectedFont = font,
                color = rgb(0.1, 0.1, 0.1),
                indent = 0
            ) => {
                const words = text.split(/\s+/).filter(Boolean);
                if (words.length === 0) return;

                const lineHeight = fontSize * 1.4;
                const effectiveMaxWidth = maxWidth - indent;
                let line = '';

                for (const word of words) {
                    const testLine = line ? `${line} ${word}` : word;
                    const textWidth = selectedFont.widthOfTextAtSize(testLine, fontSize);

                    if (textWidth > effectiveMaxWidth && line) {
                        checkNewPage(lineHeight);
                        currentPage.drawText(line, {
                            x: margin + indent,
                            y: yPos,
                            size: fontSize,
                            font: selectedFont,
                            color,
                        });
                        yPos -= lineHeight;
                        line = word;
                    } else {
                        line = testLine;
                    }
                }

                if (line) {
                    checkNewPage(lineHeight);
                    currentPage.drawText(line, {
                        x: margin + indent,
                        y: yPos,
                        size: fontSize,
                        font: selectedFont,
                        color,
                    });
                    yPos -= lineHeight;
                }
            };

            // Traverse DOM body
            const body = doc.body;
            if (!body || body.children.length === 0) {
                // If no body or empty, check raw text
                const text = doc.body?.textContent || contentToParse;
                drawWrappedText(text, 12, font);
            } else {
                const processNode = (node: Node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const txt = node.textContent?.trim();
                        if (txt) {
                            drawWrappedText(txt, 11, font);
                            yPos -= 4;
                        }
                        return;
                    }

                    if (node.nodeType !== Node.ELEMENT_NODE) return;

                    const el = node as HTMLElement;
                    const tagName = el.tagName.toLowerCase();

                    switch (tagName) {
                        case 'h1': {
                            const text = el.textContent?.trim() || '';
                            if (text) {
                                yPos -= 10;
                                drawWrappedText(text, 22, boldFont, rgb(0.05, 0.05, 0.05));
                                yPos -= 8;
                            }
                            break;
                        }
                        case 'h2': {
                            const text = el.textContent?.trim() || '';
                            if (text) {
                                yPos -= 8;
                                drawWrappedText(text, 18, boldFont, rgb(0.1, 0.1, 0.1));
                                yPos -= 6;
                            }
                            break;
                        }
                        case 'h3': {
                            const text = el.textContent?.trim() || '';
                            if (text) {
                                yPos -= 6;
                                drawWrappedText(text, 14, boldFont, rgb(0.15, 0.15, 0.15));
                                yPos -= 4;
                            }
                            break;
                        }
                        case 'h4':
                        case 'h5':
                        case 'h6': {
                            const text = el.textContent?.trim() || '';
                            if (text) {
                                yPos -= 4;
                                drawWrappedText(text, 12, boldFont, rgb(0.2, 0.2, 0.2));
                                yPos -= 4;
                            }
                            break;
                        }
                        case 'p': {
                            const text = el.textContent?.trim() || '';
                            if (text) {
                                drawWrappedText(text, 11, font, rgb(0.15, 0.15, 0.15));
                                yPos -= 6;
                            }
                            break;
                        }
                        case 'li': {
                            const text = el.textContent?.trim() || '';
                            if (text) {
                                drawWrappedText(`•  ${text}`, 11, font, rgb(0.15, 0.15, 0.15), 10);
                                yPos -= 3;
                            }
                            break;
                        }
                        case 'pre':
                        case 'code': {
                            const text = el.textContent?.trim() || '';
                            if (text) {
                                const lines = text.split('\n');
                                for (const l of lines) {
                                    checkNewPage(14);
                                    currentPage.drawText(l.substring(0, 80), {
                                        x: margin + 10,
                                        y: yPos,
                                        size: 9,
                                        font: codeFont,
                                        color: rgb(0.2, 0.2, 0.4),
                                    });
                                    yPos -= 13;
                                }
                                yPos -= 4;
                            }
                            break;
                        }
                        case 'hr': {
                            checkNewPage(15);
                            yPos -= 5;
                            currentPage.drawLine({
                                start: { x: margin, y: yPos },
                                end: { x: pageWidth - margin, y: yPos },
                                thickness: 1,
                                color: rgb(0.8, 0.8, 0.8),
                            });
                            yPos -= 10;
                            break;
                        }
                        case 'table': {
                            const rows = Array.from(el.querySelectorAll('tr'));
                            if (rows.length > 0) {
                                yPos -= 8;
                                for (const row of rows) {
                                    const cells = Array.from(row.querySelectorAll('th, td'));
                                    if (cells.length === 0) continue;

                                    const colWidth = Math.floor(maxWidth / cells.length);
                                    checkNewPage(18);

                                    cells.forEach((cell, idx) => {
                                        const isHeader = cell.tagName.toLowerCase() === 'th';
                                        const cellText = (cell.textContent?.trim() || '').substring(0, 30);
                                        currentPage.drawText(cellText, {
                                            x: margin + (idx * colWidth),
                                            y: yPos,
                                            size: 10,
                                            font: isHeader ? boldFont : font,
                                            color: rgb(0.1, 0.1, 0.1),
                                        });
                                    });
                                    yPos -= 16;
                                }
                                yPos -= 6;
                            }
                            break;
                        }
                        default: {
                            // Recursively process child nodes
                            for (let i = 0; i < el.childNodes.length; i++) {
                                processNode(el.childNodes[i]);
                            }
                            break;
                        }
                    }
                };

                for (let i = 0; i < body.childNodes.length; i++) {
                    processNode(body.childNodes[i]);
                }
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

            if (downloadUrl) URL.revokeObjectURL(downloadUrl);

            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error) {
            console.error('Error converting HTML to PDF:', error);
            alert('Error converting HTML to PDF. Please ensure the HTML is valid.');
            setStatus('IDLE');
        }
    };

    const reset = () => {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setFile(null);
        setHtmlText('');
        setStatus('IDLE');
        setDownloadUrl(null);
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1 className="text-4xl font-bold mb-4">HTML to PDF</h1>
                <p className="text-muted mb-8 text-lg">Convert HTML files or raw HTML code into PDF documents.</p>
            </div>

            {status === 'IDLE' && (
                <div className="max-w-2xl mx-auto">
                    {/* Mode Toggle */}
                    <div className="flex justify-center gap-4 mb-6">
                        <button
                            onClick={() => setMode('upload')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                mode === 'upload'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Upload HTML File
                        </button>
                        <button
                            onClick={() => setMode('paste')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                mode === 'paste'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Paste HTML Code
                        </button>
                    </div>

                    {mode === 'upload' && !file && (
                        <FileUploader onFilesSelected={handleFilesSelected} multiple={false} accept=".html,.htm" />
                    )}

                    {mode === 'upload' && file && (
                        <div>
                            <div className="bg-white p-6 rounded-lg shadow-sm border mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div style={{ backgroundColor: '#e0f2fe', padding: '12px', borderRadius: '8px' }}>
                                        <Code className="w-8 h-8" style={{ color: '#0284c7' }} />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-lg">{file.name}</h3>
                                        <p className="text-gray-500 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
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
                                    onClick={convertHtmlToPdf}
                                    className="btn btn-primary btn-lg flex items-center gap-2 px-8 py-4 text-xl"
                                >
                                    Convert to PDF <ArrowRight size={24} />
                                </button>
                            </div>
                        </div>
                    )}

                    {mode === 'paste' && (
                        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                HTML Content
                            </label>
                            <textarea
                                value={htmlText}
                                onChange={(e) => setHtmlText(e.target.value)}
                                placeholder="<h1>My Document</h1><p>Paste your HTML markup here...</p>"
                                rows={8}
                                className="w-full p-3 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <div className="flex justify-center mt-4">
                                <button
                                    onClick={convertHtmlToPdf}
                                    className="btn btn-primary btn-lg flex items-center gap-2 px-8 py-4 text-xl"
                                >
                                    Convert to PDF <ArrowRight size={24} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Converting HTML to PDF..." />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={outputFilename}
                    onReset={reset}
                />
            )}
        </div>
    );
}
