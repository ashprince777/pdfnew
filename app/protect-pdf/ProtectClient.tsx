"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { Lock } from 'lucide-react';
import styles from './page.module.css';

export default function ProtectClient() {
    const [file, setFile] = useState<File | null>(null);
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

    const handleFilesSelected = (files: File[]) => {
        if (files.length > 0) setFile(files[0]);
    };

    const protectPdf = async () => {
        if (!file || !password) return;
        setStatus('PROCESSING');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('password', password);

            const response = await fetch('/api/protect', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Server failed to protect PDF');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error) {
            console.error('Error protecting PDF:', error);
            alert('An error occurred during protection: ' + (error instanceof Error ? error.message : String(error)));
            setStatus('IDLE');
        }
    };

    const reset = () => {
        setFile(null);
        setPassword('');
        setStatus('IDLE');
        setDownloadUrl(null);
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1>Protect PDF File</h1>
                <p className="text-muted">Encrypt your PDF with a password.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} />
            )}

            {status === 'IDLE' && file && (
                <div className={styles.workspace}>
                    <div className={styles.fileItem}>
                        <span className={styles.fileName}>{file.name}</span>
                        <button onClick={reset} className={styles.removeBtn}>Change</button>
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Set a Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password..."
                            className={styles.input}
                        />
                    </div>

                    <button onClick={protectPdf} className="btn btn-primary btn-lg mt-4" disabled={!password}>
                        Protect PDF <Lock size={20} style={{ marginLeft: '10px' }} />
                    </button>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Encrypting PDF (Server-side)..." />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={`protected_${file?.name}`}
                    onReset={reset}
                />
            )}
        </div>
    );
}
