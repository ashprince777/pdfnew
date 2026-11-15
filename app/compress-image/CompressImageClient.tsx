"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ImageDown, Minimize2 } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, ChoiceGroup, PrimaryAction, Notice, toolStyles } from '@/components/ToolUI';
import { baseName, formatBytes } from '@/lib/pdf';
import { fitImageToSize } from '@/lib/imageFit';
import { IMAGE_SIZE_PRESETS_KB, sizeLabel, sizeSlug } from '@/lib/compressSizes';
import type { ExamSpec } from '@/lib/examPhotos';
import { useToolRunner } from '@/lib/useToolRunner';

const ACCEPT = '.jpg,.jpeg,.png,.webp';
const MAX_PIXELS = 10000;

/** A pixel size typed by the user, or undefined when the box is empty or out of range. */
const pixels = (value: string) => {
    const n = parseInt(value);
    return n >= 1 && n <= MAX_PIXELS ? n : undefined;
};

/** Today as DD-MM-YYYY, the usual way a photo date is written on Indian forms. */
const todayText = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

/**
 * The size landing pages (/resize-image-to-20kb etc.) reuse this tool with the limit preselected.
 * Exam pages pass `exam`: the size, pixels and file limits then come from that form's official rules.
 */
export default function CompressImageClient({ defaultTargetKb, exam }: { defaultTargetKb?: number; exam?: ExamSpec } = {}) {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [targetKb, setTargetKb] = useState(defaultTargetKb ?? 50);
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');
    const [message, setMessage] = useState('');
    const [presetId, setPresetId] = useState(exam?.presets[0].id ?? '');
    const [name, setName] = useState('');
    const [photoDate, setPhotoDate] = useState(todayText);
    const preset = exam?.presets.find((p) => p.id === presetId);
    const tool = useToolRunner();

    // Release the preview when it is replaced or the page is left.
    useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl]);

    const selectFile = (selected: File | undefined) => {
        setFile(selected ?? null);
        setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
    };

    const compress = () => {
        if (!file) return;
        tool.run(async () => {
            tool.setProgress('Finding the best quality that fits...');
            const maxKb = preset?.maxKb ?? targetKb;
            const limit = sizeLabel(maxKb);
            const result = await fitImageToSize(
                file,
                maxKb * 1024,
                preset
                    ? { width: preset.width, height: preset.height, fit: preset.fit, minBytes: (preset.minKb ?? 0) * 1024, caption: preset.caption ? [name, photoDate] : undefined }
                    : { width: pixels(width), height: pixels(height) }
            );
            const size = `${result.width} × ${result.height} px`;
            const tooSmall = preset?.minKb && result.blob.size < preset.minKb * 1024;
            setMessage(
                !result.reached
                    ? `This picture could not go under ${limit} at ${size}. The smallest version is ${formatBytes(result.blob.size)}. Try a larger limit or smaller pixel size.`
                    : tooSmall
                      ? `Your file is ${formatBytes(result.blob.size)}, below the ${preset.minKb} KB minimum. Scan or photograph the signature larger and sharper, then try again.`
                      : preset
                        ? `Done! ${formatBytes(result.blob.size)}, ${size}: ready for the ${exam!.name} form.`
                        : `Done! ${formatBytes(file.size)} → ${formatBytes(result.blob.size)}, under your ${limit} limit (${size}).`
            );
            const suffix = preset ? `${exam!.name.toLowerCase().replace(/\s+/g, '-')}-${preset.id}` : sizeSlug(targetKb);
            return { blob: result.blob, filename: `${baseName(file.name)}_${suffix}.jpg` };
        }, 'This image could not be read. Please try a JPG, PNG or WebP file.');
    };

    const reset = () => {
        tool.reset();
        selectFile(undefined);
    };

    const title = exam ? exam.title : defaultTargetKb ? `Resize Image to ${sizeLabel(defaultTargetKb)}` : 'Compress Image';
    const subtitle = exam
        ? exam.subtitle
        : defaultTargetKb
        ? `Reduce a photo, signature or scan to under ${sizeLabel(defaultTargetKb)} for online forms, without uploading it anywhere.`
        : 'Reduce a photo, signature or scan to an exact size in KB for online forms, without uploading it anywhere.';

    return (
        <div className="container">
            <ToolHeader title={title} subtitle={subtitle} />

            {tool.status === 'IDLE' && !file && <FileUploader onFilesSelected={(files) => selectFile(files[0])} accept={ACCEPT} />}

            {tool.status === 'IDLE' && file && (
                <ToolWorkspace>
                    <SelectedFile file={file} onRemove={reset} icon={ImageDown} />
                    {previewUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- local blob: URL
                        <img src={previewUrl} alt="Selected image" style={{ maxWidth: '100%', maxHeight: 220, margin: '0 auto', borderRadius: 8, display: 'block' }} />
                    )}

                    {exam && preset ? (
                        <OptionsCard title={`${exam.name} requirements`}>
                            <div style={{ display: 'grid', gap: 12 }}>
                                {exam.presets.length > 1 && (
                                    <ChoiceGroup label="What are you uploading?" value={presetId} onChange={setPresetId} options={exam.presets.map((p) => ({ value: p.id, title: p.label }))} />
                                )}
                                <p style={{ fontSize: 'var(--text-sm)' }}>
                                    <strong>You will get:</strong> {preset.summary}
                                </p>
                                {preset.caption && (
                                    <>
                                        <label className={toolStyles.label} htmlFor="caption-name">Your name (printed on the photo)</label>
                                        <input id="caption-name" type="text" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} className={toolStyles.input} placeholder="Name as in your application" />
                                        <label className={toolStyles.label} htmlFor="caption-date">Date the photo was taken</label>
                                        <input id="caption-date" type="text" maxLength={12} value={photoDate} onChange={(e) => setPhotoDate(e.target.value)} className={toolStyles.input} style={{ maxWidth: 200 }} placeholder="DD-MM-YYYY" />
                                    </>
                                )}
                            </div>
                        </OptionsCard>
                    ) : (
                        <>
                        <OptionsCard title="Size">
                            <div style={{ display: 'grid', gap: 10 }}>
                                <label className={toolStyles.label} htmlFor="image-target-kb">Maximum file size (KB)</label>
                                <input
                                    id="image-target-kb"
                                    type="number"
                                    min={5}
                                    step={5}
                                    value={targetKb}
                                    onChange={(e) => setTargetKb(parseInt(e.target.value) || 0)}
                                    className={toolStyles.input}
                                    style={{ maxWidth: 200 }}
                                />
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {IMAGE_SIZE_PRESETS_KB.map((kb) => (
                                        <button key={kb} type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 14 }} aria-pressed={targetKb === kb} onClick={() => setTargetKb(kb)}>
                                            {sizeLabel(kb)}
                                        </button>
                                    ))}
                                </div>

                                <span className={toolStyles.label} style={{ marginTop: 8 }}>Width and height in pixels (optional)</span>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input type="number" min={1} max={MAX_PIXELS} placeholder="Width" aria-label="Width in pixels" value={width} onChange={(e) => setWidth(e.target.value)} className={toolStyles.input} style={{ maxWidth: 120 }} />
                                    <span aria-hidden="true">×</span>
                                    <input type="number" min={1} max={MAX_PIXELS} placeholder="Height" aria-label="Height in pixels" value={height} onChange={(e) => setHeight(e.target.value)} className={toolStyles.input} style={{ maxWidth: 120 }} />
                                </div>
                            </div>
                        </OptionsCard>

                        <Notice>
                            {pixels(width) && pixels(height)
                                ? 'The picture is resized to exactly this width and height. If its shape is different, the edges are trimmed evenly.'
                                : 'We keep the highest quality that fits your limit, and only make the picture smaller if needed. The result is a JPG.'}
                        </Notice>

                        </>
                    )}

                    <PrimaryAction onClick={compress} disabled={preset ? Boolean(preset.caption) && (!name.trim() || !photoDate.trim()) : targetKb < 5}>
                        {preset ? `Resize ${preset.label.toLowerCase()}` : 'Compress image'} <Minimize2 size={20} />
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'IDLE' && !exam && (
                <p style={{ textAlign: 'center', marginTop: 20, fontSize: 'var(--text-sm)', color: 'var(--text-light)' }}>
                    Resize to a specific size:{' '}
                    {IMAGE_SIZE_PRESETS_KB.map((kb, i) => (
                        <span key={kb}>
                            {i > 0 && ' · '}
                            <Link href={`/resize-image-to-${sizeSlug(kb)}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                {sizeLabel(kb)}
                            </Link>
                        </span>
                    ))}
                </p>
            )}

            {tool.status === 'PROCESSING' && <Processing status={tool.progress || 'Compressing image...'} />}

            {tool.status === 'DONE' && tool.result && (
                <DownloadResult downloadUrl={tool.result.url} downloadFilename={tool.result.filename} fileSize={tool.result.size} onReset={reset} message={message} />
            )}
        </div>
    );
}
