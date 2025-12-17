"use client";
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface ConversionPageProps {
    title: string;
    description: string;
    accept: string;
    comingSoon?: boolean;
}

export default function ConversionPlaceholder({ title, description, accept, comingSoon = true }: ConversionPageProps) {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');

    const handleFilesSelected = (files: File[]) => {
        if (files.length > 0) setFile(files[0]);
    };

    const startConversion = () => {
        setStatus('PROCESSING');
        // Simulate processing
        setTimeout(() => {
            setStatus('DONE');
        }, 2000);
    };

    const reset = () => {
        setFile(null);
        setStatus('IDLE');
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1>{title}</h1>
                <p className="text-muted">{description}</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} accept={accept} />
            )}

            {status === 'IDLE' && file && (
                <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                    <div style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                        <h3>{file.name}</h3>
                        <p className="text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button onClick={startConversion} className="btn btn-primary btn-lg">
                        Convert to PDF <ArrowRight size={20} style={{ marginLeft: '10px' }} />
                    </button>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Converting file..." />}

            {status === 'DONE' && (
                <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', background: 'white', padding: '40px', borderRadius: '12px' }}>
                    <h2>Conversion Unavailable</h2>
                    <p className="mb-4">
                        This feature requires server-side processing which is not available in this client-side demo.
                        <br />
                        For a production app, integrate with a backend service like LibreOffice or CloudConvert API.
                    </p>
                    <button onClick={reset} className="btn btn-primary">
                        <ArrowLeft size={16} style={{ marginRight: '8px' }} /> Try Another Tool
                    </button>
                </div>
            )}

            <div style={{ marginTop: '60px' }}>
                {/* SEO Content Placeholder */}
                <h2>Best {title} Converter</h2>
                <p>
                    Convert your files to and from PDF with high fidelity. Our tool ensures your document formatting is preserved.
                </p>
            </div>
        </div>
    );
}
