"use client";
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FormInput } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, PrimaryAction, Notice, toolStyles } from '@/components/ToolUI';
import { baseName, PdfToolError, pdfBytesToBlob } from '@/lib/pdf';
import { fillForm, readFormFields, type FormFieldInfo, type FormValues } from '@/lib/pdfForms';
import { useToolRunner } from '@/lib/useToolRunner';

function FieldInput({ field, value, onChange }: { field: FormFieldInfo; value: FormValues[string]; onChange: (value: FormValues[string]) => void }) {
    const id = `field-${field.name}`;
    const disabled = field.readOnly;
    switch (field.kind) {
        case 'checkbox':
            return (
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input id={id} type="checkbox" checked={value === true} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
                    {field.label}
                </label>
            );
        case 'radio':
            return (
                <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                    <legend className={toolStyles.label}>{field.label}</legend>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {field.options.map((option) => (
                            <label key={option} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <input type="radio" name={id} value={option} checked={value === option} disabled={disabled} onChange={() => onChange(option)} />
                                {option}
                            </label>
                        ))}
                    </div>
                </fieldset>
            );
        case 'dropdown':
            return (
                <div className={toolStyles.field}>
                    <label className={toolStyles.label} htmlFor={id}>{field.label}</label>
                    <select id={id} className={toolStyles.input} value={value as string} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
                        <option value="">—</option>
                        {field.options.map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>
            );
        case 'list':
            return (
                <div className={toolStyles.field}>
                    <label className={toolStyles.label} htmlFor={id}>{field.label}</label>
                    <select
                        id={id}
                        className={toolStyles.input}
                        multiple={field.multiple}
                        value={field.multiple ? (value as string[]) : ((value as string[])[0] ?? '')}
                        disabled={disabled}
                        onChange={(e) => onChange(Array.from(e.target.selectedOptions, (o) => o.value).filter(Boolean))}
                    >
                        {!field.multiple && <option value="">—</option>}
                        {field.options.map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>
            );
        default:
            return (
                <div className={toolStyles.field}>
                    <label className={toolStyles.label} htmlFor={id}>{field.label}</label>
                    {field.multiline ? (
                        <textarea id={id} className={toolStyles.input} rows={3} value={value as string} maxLength={field.maxLength} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
                    ) : (
                        <input id={id} className={toolStyles.input} value={value as string} maxLength={field.maxLength} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
                    )}
                </div>
            );
    }
}

export default function FillFormClient() {
    const [file, setFile] = useState<File | null>(null);
    const [fields, setFields] = useState<FormFieldInfo[]>([]);
    const [values, setValues] = useState<FormValues>({});
    const [flatten, setFlatten] = useState(false);
    const tool = useToolRunner();

    const handleFilesSelected = (files: File[]) => {
        const selected = files[0];
        if (!selected) return;
        readFormFields(selected)
            .then((found) => {
                setFile(selected);
                setFields(found);
                setValues(Object.fromEntries(found.map((field) => [field.name, field.value])));
            })
            .catch((err) => tool.notify(err instanceof PdfToolError ? err.message : 'Could not open this PDF.'));
    };

    const fill = () => {
        if (!file) return;
        tool.run(async () => {
            const bytes = await fillForm(file, values, flatten);
            return { blob: pdfBytesToBlob(bytes), filename: `${baseName(file.name)}_filled.pdf` };
        }, 'Could not fill this form. Please try again.');
    };

    const reset = () => {
        tool.reset();
        setFile(null);
        setFields([]);
        setValues({});
    };

    const pages = Array.from(new Set(fields.map((field) => field.page)));

    return (
        <div className="container">
            <ToolHeader title="Fill PDF Forms" subtitle="Type into the fields of any fillable PDF form, then download it filled in, or flattened so it can't be changed." />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={handleFilesSelected} accept=".pdf" />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace>
                    <SelectedFile file={file} onRemove={reset} icon={FormInput} detail={`${fields.length} fillable field${fields.length === 1 ? '' : 's'}`} />

                    {fields.length === 0 ? (
                        <Notice tone="warning">
                            This PDF has no fillable form fields. To type on top of it anyway, use <Link href="/edit-pdf">Edit PDF</Link> and add text boxes where you need them.
                        </Notice>
                    ) : (
                        <>
                            {pages.map((page) => (
                                <OptionsCard key={page} title={pages.length > 1 || page > 1 ? `Page ${page}` : 'Form fields'}>
                                    <div style={{ display: 'grid', gap: 14 }}>
                                        {fields
                                            .filter((field) => field.page === page)
                                            .map((field) => (
                                                <FieldInput key={field.name} field={field} value={values[field.name]} onChange={(value) => setValues((prev) => ({ ...prev, [field.name]: value }))} />
                                            ))}
                                    </div>
                                </OptionsCard>
                            ))}

                            <OptionsCard>
                                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input type="checkbox" checked={flatten} onChange={(e) => setFlatten(e.target.checked)} />
                                    Flatten the form (answers become part of the page and can no longer be edited)
                                </label>
                            </OptionsCard>

                            <PrimaryAction onClick={fill}>
                                Fill PDF form <ArrowRight size={22} />
                            </PrimaryAction>
                        </>
                    )}
                </ToolWorkspace>
            )}

            {tool.status === 'PROCESSING' && <Processing status="Filling in the form..." />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult
                    downloadUrl={tool.result.url}
                    downloadFilename={tool.result.filename}
                    fileSize={tool.result.size}
                    onReset={reset}
                    message="Form filled successfully!"
                />
            )}
        </div>
    );
}
