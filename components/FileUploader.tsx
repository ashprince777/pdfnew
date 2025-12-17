"use client";
import { useCallback, useState, useRef } from 'react';

import { Upload, File as FileIcon, X } from 'lucide-react';
import styles from './FileUploader.module.css';

interface FileUploaderProps {
    onFilesSelected: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
}

export default function FileUploader({ onFilesSelected, accept = '.pdf', multiple = false }: FileUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            // Basic client-side filter could go here if needed
            onFilesSelected(files);
        }
    }, [onFilesSelected]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            onFilesSelected(files);
        }
    }, [onFilesSelected]);

    const handleBoxClick = useCallback((e: React.MouseEvent) => {
        // Prevent triggering if clicking on interactive elements
        if (
            (e.target as HTMLElement).closest('button') ||
            (e.target as HTMLElement).closest('label')
        ) {
            return;
        }
        fileInputRef.current?.click();
    }, []);

    return (
        <div
            className={`${styles.uploader} ${isDragging ? styles.dragging : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBoxClick}
        >
            <div className={styles.content}>
                <Upload size={64} className={styles.icon} />
                <h3 className={styles.title}>Select {multiple ? 'PDF files' : 'PDF file'}</h3>
                <p className={styles.subtitle}>or drop {multiple ? 'files' : 'file'} here</p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 w-full">
                    <label className="btn btn-primary btn-lg relative cursor-pointer px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                        <span>Select {multiple ? 'PDF files' : 'PDF file'}</span>
                        <input
                            type="file"
                            className={styles.hiddenInput}
                            accept={accept}
                            multiple={multiple}
                            onChange={handleFileInput}
                            ref={fileInputRef}
                        />
                    </label>

                    <div className="flex gap-2 items-center">
                        {/* Google Drive Button */}
                        <button
                            className="bg-white p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 group relative flex items-center justify-center shadow-sm overflow-hidden"
                            onClick={() => alert('Google Drive integration requires a configured API Key. This is a UI demo.')}
                            title="Select from Google Drive"
                            style={{ width: '40px', height: '40px' }}
                        >
                            <img
                                src="/icons/google-drive-icon.png"
                                alt="Google Drive"
                                width="24"
                                height="24"
                                className="object-contain"
                            />
                        </button>

                        {/* Dropbox Button */}
                        <button
                            className="bg-white p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 group relative flex items-center justify-center shadow-sm overflow-hidden"
                            onClick={() => alert('Dropbox integration requires a configured API Key. This is a UI demo.')}
                            title="Select from Dropbox"
                            style={{ width: '40px', height: '40px' }}
                        >
                            <img
                                src="/icons/dropbox-icon.png"
                                alt="Dropbox"
                                width="24"
                                height="24"
                                className="object-contain"
                            />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
