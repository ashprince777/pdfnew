"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { FileSpreadsheet, ArrowRight, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function PdfToExcelClient() {
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

    const convertToExcel = async () => {
        if (!file) return;

        setStatus('PROCESSING');

        try {
            // Dynamic import to avoid SSR issues
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdfDoc = await loadingTask.promise;
            const totalPages = pdfDoc.numPages;

            const wb = XLSX.utils.book_new();

            for (let i = 1; i <= totalPages; i++) {
                setProgress(`Extracting data from page ${i} of ${totalPages}...`);
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();

                // Group text items by Y position to reconstruct rows
                const rows: Map<number, { x: number; text: string }[]> = new Map();
                for (const item of textContent.items) {
                    if ('str' in item && item.str.trim()) {
                        const y = Math.round((item as any).transform[5]);
                        const x = Math.round((item as any).transform[4]);
                        if (!rows.has(y)) rows.set(y, []);
                        rows.get(y)!.push({ x, text: item.str });
                    }
                }

                // Sort rows by Y position (descending) and items within each row by X
                const sortedYs = Array.from(rows.keys()).sort((a, b) => b - a);

                const sheetData: string[][] = [];

                for (const y of sortedYs) {
                    const rowItems = rows.get(y)!.sort((a, b) => a.x - b.x);

                    // Try to detect columns by X-position clustering
                    // Simple approach: split items into cells based on gaps
                    const cells: string[] = [];
                    let currentCell = '';
                    let lastX = -Infinity;

                    for (const item of rowItems) {
                        // If gap is large enough, treat as a new cell
                        if (lastX !== -Infinity && (item.x - lastX) > 30) {
                            cells.push(currentCell.trim());
                            currentCell = item.text;
                        } else {
                            currentCell += (currentCell ? ' ' : '') + item.text;
                        }
                        lastX = item.x + (item.text.length * 5); // Approximate width
                    }
                    if (currentCell.trim()) {
                        cells.push(currentCell.trim());
                    }

                    if (cells.length > 0) {
                        sheetData.push(cells);
                    }
                }

                // Create worksheet from data
                if (sheetData.length > 0) {
                    const ws = XLSX.utils.aoa_to_sheet(sheetData);

                    // Auto-size columns
                    const colWidths = sheetData[0].map((_, colIdx) => {
                        let maxLen = 10;
                        for (const row of sheetData) {
                            if (row[colIdx] && row[colIdx].length > maxLen) {
                                maxLen = row[colIdx].length;
                            }
                        }
                        return { wch: Math.min(maxLen + 2, 50) };
                    });
                    ws['!cols'] = colWidths;

                    const sheetName = totalPages === 1 ? 'Sheet1' : `Page ${i}`;
                    XLSX.utils.book_append_sheet(wb, ws, sheetName);
                }
            }

            // If no data was extracted, add an empty sheet with a note
            if (wb.SheetNames.length === 0) {
                const ws = XLSX.utils.aoa_to_sheet([
                    ["No extractable data found in this PDF."],
                    ["The PDF may contain scanned images rather than text."]
                ]);
                XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
            }

            setProgress('Generating Excel file...');

            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            // Revoke any previous URL
            if (downloadUrl) URL.revokeObjectURL(downloadUrl);

            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error) {
            console.error("Error generating Excel:", error);
            alert("Error generating file. Please try again.");
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
                <h1 className="text-4xl font-bold mb-4">PDF to Excel</h1>
                <p className="text-muted mb-8 text-lg">Extract data from PDF files into editable Excel spreadsheets.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} multiple={false} accept=".pdf" />
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
                            onClick={convertToExcel}
                            className="btn btn-primary btn-lg flex items-center gap-2 px-8 py-4 text-xl"
                        >
                            Convert to Excel <ArrowRight size={24} />
                        </button>
                    </div>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status={progress || "Extracting tables to Excel..."} />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={`${file?.name ? file.name.replace(/\.[^/.]+$/, '') : 'document'}.xlsx`}
                    onReset={reset}
                    message="Your Excel spreadsheet is ready!"
                />
            )}
        </div>
    );
}
