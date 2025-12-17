import { Download, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import styles from './DownloadResult.module.css';

interface DownloadResultProps {
    downloadUrl: string;
    downloadFilename: string;
    onReset: () => void;
    message?: string;
}

export default function DownloadResult({ downloadUrl, downloadFilename, onReset, message = 'Your PDF is ready!' }: DownloadResultProps) {
    return (
        <div className={styles.container}>
            <CheckCircle size={64} className={styles.icon} />
            <h2 className={styles.title}>{message}</h2>

            <a href={downloadUrl} download={downloadFilename} className={`btn btn-primary btn-lg ${styles.downloadBtn}`}>
                <Download size={24} style={{ marginRight: '10px' }} />
                Download File
            </a>

            <p className={styles.note}>
                Files are automatically deleted from our servers users' privacy (if server-side).
                <br />Since this tool runs in your browser, your files never leave your device!
            </p>

            <div className={styles.actions}>
                <button onClick={onReset} className={styles.linkBtn}>
                    <ArrowLeft size={16} /> Process another file
                </button>
            </div>
        </div>
    );
}
