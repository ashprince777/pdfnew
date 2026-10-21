import React from 'react';
import { FileText, Info, AlertTriangle, Trash2, type LucideIcon } from 'lucide-react';
import { formatBytes } from '@/lib/pdf';
import styles from './ToolUI.module.css';

export { styles as toolStyles };

export function ToolHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className={styles.header}>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
        </div>
    );
}

export function ToolWorkspace({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
    return <div className={`${styles.workspace} ${wide ? styles.workspaceWide : ''}`}>{children}</div>;
}

interface SelectedFileProps {
    file: File;
    onRemove: () => void;
    icon?: LucideIcon;
    detail?: React.ReactNode;
    removeLabel?: string;
}

export function SelectedFile({ file, onRemove, icon: Icon = FileText, detail, removeLabel = 'Remove file' }: SelectedFileProps) {
    return (
        <div className={`${styles.card} ${styles.fileCard}`}>
            <div className={styles.fileMeta}>
                <div className={styles.fileIcon}>
                    <Icon size={24} aria-hidden="true" />
                </div>
                <div style={{ minWidth: 0 }}>
                    <p className={styles.fileName} title={file.name}>
                        {file.name}
                    </p>
                    <p className={styles.fileDetail}>
                        {formatBytes(file.size)}
                        {detail ? <> · {detail}</> : null}
                    </p>
                </div>
            </div>
            <button type="button" onClick={onRemove} className={styles.iconButton} aria-label={removeLabel} title={removeLabel}>
                <Trash2 size={20} aria-hidden="true" />
            </button>
        </div>
    );
}

export function OptionsCard({ title, children }: { title?: string; children: React.ReactNode }) {
    return (
        <section className={styles.card}>
            {title && <h2 className={styles.sectionTitle}>{title}</h2>}
            {children}
        </section>
    );
}

interface ChoiceOption<T extends string> {
    value: T;
    title: string;
    text?: string;
}

export function ChoiceGroup<T extends string>({
    options,
    value,
    onChange,
    label,
}: {
    options: ChoiceOption<T>[];
    value: T;
    onChange: (value: T) => void;
    label: string;
}) {
    return (
        <div className={styles.choiceGrid} role="radiogroup" aria-label={label}>
            {options.map((option) => {
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(option.value)}
                        className={`${styles.choice} ${active ? styles.choiceActive : ''}`}
                    >
                        <span className={styles.choiceTitle}>{option.title}</span>
                        {option.text && <span className={styles.choiceText}>{option.text}</span>}
                    </button>
                );
            })}
        </div>
    );
}

export function PrimaryAction({
    onClick,
    disabled,
    children,
}: {
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
}) {
    return (
        <button type="button" onClick={onClick} disabled={disabled} className={`btn btn-primary btn-lg ${styles.primaryAction}`}>
            {children}
        </button>
    );
}

export function Notice({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warning' }) {
    const Icon = tone === 'warning' ? AlertTriangle : Info;
    return (
        <div className={`${styles.notice} ${tone === 'warning' ? styles.noticeWarning : ''}`} role="note">
            <Icon size={18} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
            <div>{children}</div>
        </div>
    );
}
