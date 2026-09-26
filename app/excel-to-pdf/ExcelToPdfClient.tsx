"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { FileSpreadsheet, ArrowRight, Trash2 } from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as XLSX from 'xlsx';

export default function ExcelToPdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

    const handleFilesSelected = (newFiles: File[]) => {
        if (newFiles.length > 0) {
            setFile(newFiles[0]);
        }
    };

    const removeFile = () => {
        setFile(null);
    };

    const convertToPdf = async () => {
        if (!file) return;

        setStatus('PROCESSING');

        try {
            // Read the Excel file
            const arrayBuffer = await file.arrayBuffer();
            const wb = XLSX.read(arrayBuffer, { type: 'array' });

            const pdfDoc = await PDFDocument.create();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const fontSize = 10;
            const headerFontSize = 12;
            const lineHeight = fontSize * 1.8;
            const margin = 40;
            const pageWidth = 841.89; // A4 Landscape for better table fit
            const pageHeight = 595.28;
            const maxWidth = pageWidth - margin * 2;

            for (const sheetName of wb.SheetNames) {
                const ws = wb.Sheets[sheetName];
                const data: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];

                if (data.length === 0) continue;

                let page = pdfDoc.addPage([pageWidth, pageHeight]);
                let yPos = pageHeight - margin;

                // Draw sheet name as header
                page.drawText(`Sheet: ${sheetName}`, {
                    x: margin,
                    y: yPos,
                    size: headerFontSize,
                    font: boldFont,
                    color: rgb(0.13, 0.45, 0.27),
                });
                yPos -= lineHeight * 1.5;

                // Calculate column widths based on content
                const maxCols = Math.max(...data.map(row => row.length));
                const colWidth = Math.min(Math.floor(maxWidth / Math.max(maxCols, 1)), 150);

                for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
                    const row = data[rowIdx];

                    if (yPos < margin + lineHeight) {
                        page = pdfDoc.addPage([pageWidth, pageHeight]);
                        yPos = pageHeight - margin;
                    }

                    // Draw alternating row background
                    if (rowIdx === 0) {
                        page.drawRectangle({
                            x: margin - 4,
                            y: yPos - 4,
                            width: Math.min(maxCols * colWidth, maxWidth) + 8,
                            height: lineHeight,
                            color: rgb(0.85, 0.93, 0.86),
                        });
                    } else if (rowIdx % 2 === 0) {
                        page.drawRectangle({
                            x: margin - 4,
                            y: yPos - 4,
                            width: Math.min(maxCols * colWidth, maxWidth) + 8,
                            height: lineHeight,
                            color: rgb(0.96, 0.96, 0.96),
                        });
                    }

                    for (let colIdx = 0; colIdx < row.length; colIdx++) {
                        const rawCell = String(row[colIdx] ?? '');
                        const cellText = rawCell
                            .replace(/[\u201C\u201D]/g, '"')
                            .replace(/[\u2018\u2019]/g, "'")
                            .replace(/[\u2013\u2014]/g, '-')
                            .replace(/[\u2022\u00B7]/g, '* ')
                            .replace(/[\u20B9]/g, 'Rs. ')
                            .replace(/[\u20AC]/g, 'EUR ')
                            .replace(/[\u00A3]/g, 'GBP ')
                            .replace(/[\u00A5]/g, 'JPY ')
                            .replace(/[^\x00-\xFF]/g, ' ');

                        // Truncate if too long
                        const maxChars = Math.floor(colWidth / (fontSize * 0.5));
                        const displayText = cellText.length > maxChars
                            ? cellText.substring(0, maxChars - 2) + '..'
                            : cellText;

                        const xPos = margin + colIdx * colWidth;
                        if (xPos + colWidth > pageWidth - margin + 20) break; // Don't overflow page

                        try {
                            page.drawText(displayText, {
                                x: xPos,
                                y: yPos,
                                size: rowIdx === 0 ? fontSize + 1 : fontSize,
                                font: rowIdx === 0 ? boldFont : font,
                                color: rgb(0, 0, 0),
                            });
                        } catch {
                            // Safe fallback for any obscure character
                            page.drawText(displayText.replace(/[^\x20-\x7E]/g, ' '), {
                                x: xPos,
                                y: yPos,
                                size: rowIdx === 0 ? fontSize + 1 : fontSize,
                                font: rowIdx === 0 ? boldFont : font,
                                color: rgb(0, 0, 0),
                            });
                        }
                    }

                    yPos -= lineHeight;
                }
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

            if (downloadUrl) URL.revokeObjectURL(downloadUrl);

            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Error converting file. Please ensure it's a valid Excel file.");
            setStatus('IDLE');
        }
    };

    const reset = () => {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setFile(null);
        setStatus('IDLE');
        setDownloadUrl(null);
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1 className="text-4xl font-bold mb-4">Excel to PDF</h1>
                <p className="text-muted mb-8 text-lg">Convert your Excel spreadsheets to PDF.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} multiple={false} accept=".xlsx,.xls" />
            )}

            {status === 'IDLE' && file && (
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-green-100 p-3 rounded-lg">
                                <FileSpreadsheet className="text-green-600 w-8 h-8" />
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

            {status === 'PROCESSING' && <Processing status="Converting Excel to PDF..." />}

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
