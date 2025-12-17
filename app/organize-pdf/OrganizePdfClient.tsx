"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { FileText, Trash2, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';

export default function OrganizePdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

    // Simulate pages (mock count)
    const [pages, setPages] = useState<number[]>([]);

    const handleFilesSelected = (newFiles: File[]) => {
        if (newFiles.length > 0) {
            setFile(newFiles[0]);
            // Simulate 5 pages
            setPages([1, 2, 3, 4, 5]);
        }
    };

    const removeFile = () => {
        setFile(null);
        setPages([]);
    };

    const movePage = (index: number, direction: 'up' | 'down') => {
        const newPages = [...pages];
        if (direction === 'up' && index > 0) {
            [newPages[index], newPages[index - 1]] = [newPages[index - 1], newPages[index]];
        } else if (direction === 'down' && index < newPages.length - 1) {
            [newPages[index], newPages[index + 1]] = [newPages[index + 1], newPages[index]];
        }
        setPages(newPages);
    };

    const deletePage = (index: number) => {
        const newPages = pages.filter((_, i) => i !== index);
        setPages(newPages);
    };

    const saveChanges = async () => {
        setStatus('PROCESSING');
        setTimeout(() => {
            alert("Organization changes applied (Simulation). Saving functionality coming soon.");
            setStatus('IDLE');
        }, 1500);
    };

    const reset = () => {
        setFile(null);
        setStatus('IDLE');
        setDownloadUrl(null);
        setPages([]);
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1 className="text-4xl font-bold mb-4">Organize PDF</h1>
                <p className="text-muted mb-8 text-lg">Sort, reorder, and delete pages from your PDF.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} multiple={false} accept=".pdf" />
            )}

            {status === 'IDLE' && file && (
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-6 p-4 bg-white rounded shadow-sm">
                        <div className="flex items-center gap-4">
                            <span className="font-medium">{file.name}</span>
                            <span className="text-sm text-gray-500">{pages.length} Pages</span>
                        </div>
                        <button onClick={removeFile} className="text-red-500 hover:text-red-700 font-medium">
                            CANCEL
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {pages.map((pageNum, index) => (
                            <div key={pageNum} className="bg-white p-4 rounded shadow-sm border relative group">
                                <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center mb-2">
                                    <span className="text-2xl font-bold text-gray-300">Page {pageNum}</span>
                                </div>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <button onClick={() => deletePage(index)} className="bg-red-500 text-white p-1 rounded hover:bg-red-600">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="flex justify-center gap-2 mt-2">
                                    <button
                                        onClick={() => movePage(index, 'up')}
                                        disabled={index === 0}
                                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                                    >
                                        <ArrowUp size={16} />
                                    </button>
                                    <button
                                        onClick={() => movePage(index, 'down')}
                                        disabled={index === pages.length - 1}
                                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                                    >
                                        <ArrowDown size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center">
                        <button onClick={saveChanges} className="btn btn-primary btn-lg flex items-center gap-2">
                            Save Changes <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Organizing PDF..." />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename="organized.pdf"
                    onReset={reset}
                />
            )}
        </div>
    );
}
