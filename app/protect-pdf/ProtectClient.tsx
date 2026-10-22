"use client";
import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, PrimaryAction, Notice, toolStyles } from '@/components/ToolUI';
import { baseName, pdfBytesToBlob } from '@/lib/pdf';
import { runPdfOp } from '@/lib/pdfWorkerClient';
import { useToolRunner } from '@/lib/useToolRunner';

const MIN_PASSWORD_LENGTH = 4;

function randomOwnerPassword(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export default function ProtectClient() {
    const [file, setFile] = useState<File | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [allowPrinting, setAllowPrinting] = useState(true);
    const [allowCopying, setAllowCopying] = useState(true);
    const [allowEditing, setAllowEditing] = useState(true);
    const tool = useToolRunner();

    const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
    const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
    const canSubmit = password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword;

    const protectPdf = () => {
        if (!file || !canSubmit) return;
        tool.run(async () => {
            const bytes = await runPdfOp('protectPdf', [
                await file.arrayBuffer(),
                {
                    userPassword: password,
                    // A separate random owner password makes the restrictions enforceable.
                    ownerPassword: randomOwnerPassword(),
                    allowPrinting,
                    allowCopying,
                    allowEditing,
                },
            ]);
            return { blob: pdfBytesToBlob(bytes), filename: `${baseName(file.name)}_protected.pdf` };
        }, 'Could not protect this PDF. Please try another file.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
        setPassword('');
        setConfirmPassword('');
    };

    const checkbox = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', minHeight: 32 }}>
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18 }} />
            <span>{label}</span>
        </label>
    );

    return (
        <div className="container">
            <ToolHeader title="Protect PDF File" subtitle="Encrypt your PDF with a password using AES-256, right in your browser." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={(files) => setFile(files[0] ?? null)} />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace>
                    <SelectedFile file={file} onRemove={reset} />

                    <OptionsCard title="Set a password">
                        <div style={{ display: 'grid', gap: 14 }}>
                            <div className={toolStyles.field}>
                                <label className={toolStyles.label} htmlFor="protect-password">Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        id="protect-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password..."
                                        autoComplete="new-password"
                                        className={toolStyles.input}
                                        style={{ paddingRight: 48 }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className={toolStyles.iconButton}
                                        style={{ position: 'absolute', right: 0, top: 0 }}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {passwordTooShort && (
                                    <span className={toolStyles.hint} style={{ color: 'var(--error)' }}>
                                        Use at least {MIN_PASSWORD_LENGTH} characters.
                                    </span>
                                )}
                            </div>
                            <div className={toolStyles.field}>
                                <label className={toolStyles.label} htmlFor="protect-confirm">Confirm password</label>
                                <input
                                    id="protect-confirm"
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repeat password..."
                                    autoComplete="new-password"
                                    className={toolStyles.input}
                                />
                                {mismatch && (
                                    <span className={toolStyles.hint} style={{ color: 'var(--error)' }}>
                                        Passwords do not match.
                                    </span>
                                )}
                            </div>
                        </div>
                    </OptionsCard>

                    <OptionsCard title="Permissions for people who open the file">
                        <div style={{ display: 'grid', gap: 4 }}>
                            {checkbox('Allow printing', allowPrinting, setAllowPrinting)}
                            {checkbox('Allow copying text and images', allowCopying, setAllowCopying)}
                            {checkbox('Allow editing, commenting and page changes', allowEditing, setAllowEditing)}
                        </div>
                    </OptionsCard>

                    <Notice>
                        Keep your password safe. It cannot be recovered. Everything happens on your device; the file and
                        password are never uploaded.
                    </Notice>

                    <PrimaryAction onClick={protectPdf} disabled={!canSubmit}>
                        Protect PDF <Lock size={20} />
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status="Encrypting PDF with AES-256..." />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="Your PDF is now password-protected!"
                />
            )}
        </div>
    );
}
