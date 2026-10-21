"use client";
import { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, PrimaryAction, Notice, toolStyles } from '@/components/ToolUI';
import { baseName, decryptPdf, isPdfEncrypted, PdfToolError, savePdf } from '@/lib/pdf';
import { useToolRunner } from '@/lib/useToolRunner';

export default function UnlockPdfClient() {
    const [file, setFile] = useState<File | null>(null);
    const [password, setPassword] = useState('');
    const tool = useToolRunner();

    const unlockPdf = () => {
        if (!file) return;
        tool.run(async () => {
            if (!(await isPdfEncrypted(file))) {
                throw new PdfToolError('This PDF is not password-protected or restricted, so there is nothing to unlock.', 'NOT_ENCRYPTED');
            }
            // An empty password unlocks files that only carry permission restrictions.
            const pdfDoc = await decryptPdf(file, password);
            return { blob: await savePdf(pdfDoc), filename: `${baseName(file.name)}_unlocked.pdf` };
        }, 'Could not unlock this file.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
        setPassword('');
    };

    return (
        <div className="container">
            <ToolHeader title="Unlock PDF" subtitle="Remove the password and restrictions from a PDF you have the right to open." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={(files) => setFile(files[0] ?? null)} accept=".pdf" />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace>
                    <SelectedFile file={file} onRemove={reset} icon={Lock} />

                    <OptionsCard title="Password">
                        <div className={toolStyles.field}>
                            <label className={toolStyles.label} htmlFor="unlock-password">
                                Password (leave empty if the file opens without one)
                            </label>
                            <input
                                id="unlock-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && unlockPdf()}
                                className={toolStyles.input}
                                placeholder="Enter PDF password"
                                autoComplete="off"
                            />
                            <span className={toolStyles.hint}>
                                Files that open freely but block printing or copying can be unlocked without a password.
                            </span>
                        </div>
                    </OptionsCard>

                    <Notice>
                        The original text, images, links and bookmarks are kept. Only the encryption is removed.
                    </Notice>

                    <PrimaryAction onClick={unlockPdf}>
                        <Unlock size={20} /> Unlock PDF
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status="Removing security restrictions..." />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="PDF unlocked! The password and restrictions have been removed."
                />
            )}
        </div>
    );
}
