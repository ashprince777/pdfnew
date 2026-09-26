"use client";
import React, { useState } from 'react';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ArrowLeftRight, FileText, Upload, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface ComparisonResult {
    totalOriginalPages: number;
    totalModifiedPages: number;
    pages: {
        pageNum: number;
        originalLines: string[];
        modifiedLines: string[];
        diffStats: { added: number; removed: number; same: number };
    }[];
}

export default function ComparePdfClient() {
    const [file1, setFile1] = useState<File | null>(null);
    const [file2, setFile2] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [progress, setProgress] = useState('');
    const [result, setResult] = useState<ComparisonResult | null>(null);
    const [selectedPage, setSelectedPage] = useState<number>(1);
    const [reportUrl, setReportUrl] = useState<string | null>(null);

    const extractTextPages = async (file: File): Promise<string[][]> => {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pagesData: string[][] = [];

        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            const lines: string[] = [];

            for (const item of textContent.items) {
                if ('str' in item && item.str.trim()) {
                    lines.push(item.str.trim());
                }
            }
            pagesData.push(lines);
        }
        return pagesData;
    };

    const runComparison = async () => {
        if (!file1 || !file2) {
            alert('Please select both Original and Modified PDF files.');
            return;
        }

        setStatus('PROCESSING');
        setProgress('Extracting text from original file...');

        try {
            const pages1 = await extractTextPages(file1);
            setProgress('Extracting text from modified file...');
            const pages2 = await extractTextPages(file2);

            setProgress('Analyzing text differences...');
            const maxPages = Math.max(pages1.length, pages2.length);
            const pagesComparison: ComparisonResult['pages'] = [];

            for (let i = 0; i < maxPages; i++) {
                const origLines = pages1[i] || [];
                const modLines = pages2[i] || [];

                const origSet = new Set(origLines);
                const modSet = new Set(modLines);

                const sameCount = origLines.filter((l) => modSet.has(l)).length;
                const removedCount = origLines.length - sameCount;
                const addedCount = modLines.filter((l) => !origSet.has(l)).length;

                pagesComparison.push({
                    pageNum: i + 1,
                    originalLines: origLines,
                    modifiedLines: modLines,
                    diffStats: {
                        added: addedCount,
                        removed: removedCount,
                        same: sameCount,
                    },
                });
            }

            setResult({
                totalOriginalPages: pages1.length,
                totalModifiedPages: pages2.length,
                pages: pagesComparison,
            });
            setSelectedPage(1);
            setStatus('DONE');
        } catch (error) {
            console.error('Error comparing PDFs:', error);
            alert('Failed to compare PDFs. Please ensure both files are valid.');
            setStatus('IDLE');
        }
    };

    const generateComparisonPdf = async () => {
        if (!result || !file1 || !file2) return;

        try {
            const pdfDoc = await PDFDocument.create();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            const page = pdfDoc.addPage([595.28, 841.89]);
            let y = 780;

            page.drawText('PDF Comparison Report', {
                x: 50,
                y,
                size: 22,
                font: boldFont,
                color: rgb(0.1, 0.1, 0.1),
            });
            y -= 30;

            page.drawText(`File 1 (Original): ${file1.name} (${result.totalOriginalPages} pages)`, {
                x: 50,
                y,
                size: 11,
                font,
            });
            y -= 18;

            page.drawText(`File 2 (Modified): ${file2.name} (${result.totalModifiedPages} pages)`, {
                x: 50,
                y,
                size: 11,
                font,
            });
            y -= 30;

            for (const p of result.pages) {
                if (y < 80) break;
                page.drawText(
                    `Page ${p.pageNum}: ${p.diffStats.added} additions, ${p.diffStats.removed} deletions, ${p.diffStats.same} matching lines`,
                    { x: 50, y, size: 10, font: boldFont }
                );
                y -= 16;
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

            if (reportUrl) URL.revokeObjectURL(reportUrl);
            const url = URL.createObjectURL(blob);
            setReportUrl(url);
        } catch (e) {
            console.error('Could not generate report', e);
        }
    };

    const reset = () => {
        if (reportUrl) URL.revokeObjectURL(reportUrl);
        setFile1(null);
        setFile2(null);
        setResult(null);
        setReportUrl(null);
        setStatus('IDLE');
        setProgress('');
    };

    const currentPageData = result?.pages.find((p) => p.pageNum === selectedPage);

    return (
        <div className="container" style={{ paddingBottom: '60px' }}>
            <div className="text-center mt-4 mb-4">
                <h1 className="text-4xl font-bold mb-4">Compare PDF Documents</h1>
                <p className="text-muted mb-8 text-lg">Find visual and textual differences between two PDF versions side-by-side.</p>
            </div>

            {status === 'IDLE' && (
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Box 1 */}
                        <div className="border-2 border-dashed rounded-xl p-8 text-center bg-white shadow-sm flex flex-col items-center justify-center">
                            <FileText size={48} className="text-blue-500 mb-3" />
                            <h3 className="font-semibold text-lg mb-1">Original PDF (File 1)</h3>
                            <p className="text-xs text-gray-500 mb-4">{file1 ? file1.name : 'Select initial document'}</p>
                            <label className="btn btn-outline cursor-pointer text-sm">
                                <Upload size={16} className="mr-2" /> {file1 ? 'Change File' : 'Upload File 1'}
                                <input
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && setFile1(e.target.files[0])}
                                />
                            </label>
                        </div>

                        {/* Box 2 */}
                        <div className="border-2 border-dashed rounded-xl p-8 text-center bg-white shadow-sm flex flex-col items-center justify-center">
                            <FileText size={48} className="text-red-500 mb-3" />
                            <h3 className="font-semibold text-lg mb-1">Modified PDF (File 2)</h3>
                            <p className="text-xs text-gray-500 mb-4">{file2 ? file2.name : 'Select revised document'}</p>
                            <label className="btn btn-outline cursor-pointer text-sm">
                                <Upload size={16} className="mr-2" /> {file2 ? 'Change File' : 'Upload File 2'}
                                <input
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && setFile2(e.target.files[0])}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <button
                            onClick={runComparison}
                            disabled={!file1 || !file2}
                            className="btn btn-primary btn-lg flex items-center gap-2 px-10 py-4 text-xl disabled:opacity-40"
                        >
                            Compare Documents <ArrowLeftRight size={22} />
                        </button>
                    </div>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status={progress || "Comparing documents..."} />}

            {status === 'DONE' && result && (
                <div className="space-y-6">
                    {/* Summary Bar */}
                    <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4 text-sm">
                            <span className="font-semibold text-gray-700">Pages:</span>
                            <div className="flex gap-1 overflow-x-auto max-w-md">
                                {result.pages.map((p) => (
                                    <button
                                        key={p.pageNum}
                                        onClick={() => setSelectedPage(p.pageNum)}
                                        className={`px-3 py-1 rounded text-xs font-semibold ${
                                            selectedPage === p.pageNum
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        Pg {p.pageNum}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={generateComparisonPdf}
                                className="btn btn-outline text-xs py-1.5 px-3 font-semibold"
                            >
                                Download Report PDF
                            </button>
                            <button onClick={reset} className="text-sm text-red-500 hover:text-red-700 font-medium">
                                New Comparison
                            </button>
                        </div>
                    </div>

                    {reportUrl && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                            <a
                                href={reportUrl}
                                download="comparison_report.pdf"
                                className="text-green-700 font-semibold underline text-sm"
                            >
                                📥 Download Generated PDF Comparison Report
                            </a>
                        </div>
                    )}

                    {/* Side-by-Side Comparison Panels */}
                    {currentPageData && (
                        <div>
                            <div className="flex items-center justify-center gap-6 mb-3 text-xs">
                                <span className="flex items-center gap-1.5 text-green-700 font-medium">
                                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
                                    {currentPageData.diffStats.added} Additions
                                </span>
                                <span className="flex items-center gap-1.5 text-red-700 font-medium">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                                    {currentPageData.diffStats.removed} Deletions
                                </span>
                                <span className="flex items-center gap-1.5 text-gray-600">
                                    <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block"></span>
                                    {currentPageData.diffStats.same} Unchanged
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Left: Original */}
                                <div className="bg-white border rounded-lg p-5 shadow-sm">
                                    <h4 className="font-semibold text-sm text-blue-700 border-b pb-2 mb-3">
                                        Original Document (Page {selectedPage})
                                    </h4>
                                    <div className="space-y-1 font-mono text-xs max-h-96 overflow-y-auto">
                                        {currentPageData.originalLines.length > 0 ? (
                                            currentPageData.originalLines.map((line, idx) => {
                                                const isDeleted = !currentPageData.modifiedLines.includes(line);
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`p-1 rounded ${
                                                            isDeleted ? 'bg-red-100 text-red-800 font-semibold' : 'text-gray-700'
                                                        }`}
                                                    >
                                                        {isDeleted ? '- ' : '  '}
                                                        {line}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="text-gray-400 italic">No text on this page.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Modified */}
                                <div className="bg-white border rounded-lg p-5 shadow-sm">
                                    <h4 className="font-semibold text-sm text-red-700 border-b pb-2 mb-3">
                                        Modified Document (Page {selectedPage})
                                    </h4>
                                    <div className="space-y-1 font-mono text-xs max-h-96 overflow-y-auto">
                                        {currentPageData.modifiedLines.length > 0 ? (
                                            currentPageData.modifiedLines.map((line, idx) => {
                                                const isAdded = !currentPageData.originalLines.includes(line);
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`p-1 rounded ${
                                                            isAdded ? 'bg-green-100 text-green-800 font-semibold' : 'text-gray-700'
                                                        }`}
                                                    >
                                                        {isAdded ? '+ ' : '  '}
                                                        {line}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="text-gray-400 italic">No text on this page.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
