"use client";
import { useEffect, useState } from 'react';
import { getErrorMessage } from './pdf';
import { canvasToBlob, openPdfjsDocument, releaseCanvas, renderPageToCanvas } from './pdfjs';

interface ThumbnailState {
    file: File | null;
    pageCount: number | null;
    /** Object URLs keyed by 1-based page number, filled in as pages render. */
    thumbnails: Record<number, string>;
    error: string | null;
}

const EMPTY: ThumbnailState = { file: null, pageCount: null, thumbnails: {}, error: null };

/**
 * Renders small previews of every page of `file`, one page at a time so the UI stays
 * responsive. Rendering stops and all object URLs are released when the file changes
 * or the component unmounts.
 */
export function usePdfThumbnails(file: File | null, targetWidth = 180) {
    const [state, setState] = useState<ThumbnailState>(EMPTY);

    useEffect(() => {
        if (!file) return;
        let cancelled = false;
        const urls: string[] = [];

        (async () => {
            try {
                const doc = await openPdfjsDocument(await file.arrayBuffer());
                if (cancelled) return void doc.destroy();
                setState({ file, pageCount: doc.numPages, thumbnails: {}, error: null });

                const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
                for (let i = 1; i <= doc.numPages && !cancelled; i++) {
                    const page = await doc.getPage(i);
                    const scale = (targetWidth * pixelRatio) / page.getViewport({ scale: 1 }).width;
                    const canvas = await renderPageToCanvas(page, scale);
                    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.75);
                    releaseCanvas(canvas);
                    page.cleanup();
                    if (cancelled) break;
                    const url = URL.createObjectURL(blob);
                    urls.push(url);
                    setState((prev) => (prev.file === file ? { ...prev, thumbnails: { ...prev.thumbnails, [i]: url } } : prev));
                }
                await doc.destroy();
            } catch (error) {
                if (!cancelled) {
                    setState({ file, pageCount: null, thumbnails: {}, error: getErrorMessage(error, 'Could not open this PDF.') });
                }
            }
        })();

        return () => {
            cancelled = true;
            urls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [file, targetWidth]);

    // State from a previous file is ignored until the new file has been opened.
    return state.file === file ? state : EMPTY;
}
