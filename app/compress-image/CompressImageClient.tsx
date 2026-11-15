"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ImageDown, Minimize2 } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, PrimaryAction, Notice, toolStyles } from '@/components/ToolUI';
import { baseName, formatBytes } from '@/lib/pdf';
import { fitImageToSize } from '@/lib/imageFit';
import { IMAGE_SIZE_PRESETS_KB, sizeLabel, sizeSlug } from '@/lib/compressSizes';
import { useToolRunner } from '@/lib/useToolRunner';

const ACCEPT = '.jpg,.jpeg,.png,.webp';
const MAX_PIXELS = 10000;

/** A pixel size typed by the user, or undefined when the box is empty or out of range. */
const pixels = (value: string) => {
    const n = parseInt(value);
    return n >= 1 && n <= MAX_PIXELS ? n : undefined;
};

/** The size landing pages (/resize-image-to-20kb etc.) reuse this tool with the limit preselected. */
export default function CompressImageClient({ defaultTargetKb }: { defaultTargetKb?: number } = {}) {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [targetKb, setTargetKb] = useState(defaultTargetKb ?? 50);
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');
    const [message, setMessage] = useState('');
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
            const limit = sizeLabel(targetKb);
            const result = await fitImageToSize(file, targetKb * 1024, { width: pixels(width), height: pixels(height) });
            const size = `${result.width} × ${result.height} px`;
            setMessage(
                result.reached
                    ? `Done! ${formatBytes(file.size)} → ${formatBytes(result.blob.size)}, under your ${limit} limit (${size}).`
                    : `This picture could not go under ${limit} at ${size}. The smallest version is ${formatBytes(result.blob.size)}. Try a larger limit or smaller pixel size.`
            );
            return { blob: result.blob, filename: `${baseName(file.name)}_${sizeSlug(targetKb)}.jpg` };
        }, 'This image could not be read. Please try a JPG, PNG or WebP file.');
    };

    const reset = () => {
        tool.reset();
        selectFile(undefined);
    };

    const title = defaultTargetKb ? `Resize Image to ${sizeLabel(defaultTargetKb)}` : 'Compress Image';
    const subtitle = defaultTargetKb
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

                    <PrimaryAction onClick={compress} disabled={targetKb < 5}>
                        Compress image <Minimize2 size={20} />
                    </PrimaryAction>
                </ToolWorkspace>
            )}

            {tool.status === 'IDLE' && (
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
