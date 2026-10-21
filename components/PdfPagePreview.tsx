"use client";
import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { canvasToBlob, openPdfjsDocument, releaseCanvas, renderPageToCanvas } from '@/lib/pdfjs';
import { getErrorMessage } from '@/lib/pdf';

export interface PageSize {
    /** Displayed page size in PDF points (after /Rotate). */
    width: number;
    height: number;
}

interface PdfPagePreviewProps {
    file: File;
    /** 1-based page number */
    pageNumber: number;
    onPageCount?: (count: number) => void;
    onPageSize?: (size: PageSize) => void;
    /** Overlays positioned in percentages of the page box. */
    children?: React.ReactNode;
    overlayProps?: React.HTMLAttributes<HTMLDivElement>;
    maxWidth?: number;
}

/**
 * Renders one page of a PDF as an image with an overlay layer on top, sized to the
 * displayed page so that overlay percentages map directly onto the page.
 */
export default function PdfPagePreview({
    file,
    pageNumber,
    onPageCount,
    onPageSize,
    children,
    overlayProps,
    maxWidth = 820,
}: PdfPagePreviewProps) {
    const [doc, setDoc] = useState<{ file: File; proxy: PDFDocumentProxy } | null>(null);
    const [image, setImage] = useState<{ url: string; ratio: number; key: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const callbacks = useRef({ onPageCount, onPageSize });

    useEffect(() => {
        callbacks.current = { onPageCount, onPageSize };
    });

    useEffect(() => {
        let cancelled = false;
        let proxy: PDFDocumentProxy | null = null;
        file.arrayBuffer()
            .then((buffer) => openPdfjsDocument(buffer))
            .then((opened) => {
                proxy = opened;
                if (cancelled) return void opened.destroy();
                setDoc({ file, proxy: opened });
                callbacks.current.onPageCount?.(opened.numPages);
            })
            .catch((err) => !cancelled && setError(getErrorMessage(err, 'Could not render a preview of this PDF.')));
        return () => {
            cancelled = true;
            proxy?.destroy();
        };
    }, [file]);

    const activeDoc = doc && doc.file === file ? doc.proxy : null;
    const imageKey = `${pageNumber}`;

    useEffect(() => {
        if (!activeDoc) return;
        let cancelled = false;
        let url: string | null = null;
        (async () => {
            const page = await activeDoc.getPage(Math.min(Math.max(1, pageNumber), activeDoc.numPages));
            const base = page.getViewport({ scale: 1 });
            callbacks.current.onPageSize?.({ width: base.width, height: base.height });
            const scale = (maxWidth * Math.min(window.devicePixelRatio || 1, 2)) / base.width;
            const canvas = await renderPageToCanvas(page, scale);
            const blob = await canvasToBlob(canvas, 'image/png');
            releaseCanvas(canvas);
            page.cleanup();
            if (cancelled) return;
            url = URL.createObjectURL(blob);
            setImage({ url, ratio: base.height / base.width, key: imageKey });
        })().catch((err) => !cancelled && setError(getErrorMessage(err, 'Could not render this page.')));
        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
        };
    }, [activeDoc, pageNumber, maxWidth, imageKey]);

    if (error) {
        return <p role="alert" style={{ color: 'var(--error)', textAlign: 'center' }}>{error}</p>;
    }

    const ready = image && image.key === imageKey;

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                maxWidth,
                margin: '0 auto',
                aspectRatio: ready ? `1 / ${image.ratio}` : '1 / 1.414',
                background: '#fff',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-color)',
                borderRadius: 4,
                overflow: 'hidden',
                userSelect: 'none',
                touchAction: 'none',
            }}
        >
            {ready ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob: URL
                <img src={image.url} alt={`Page ${pageNumber}`} draggable={false} style={{ display: 'block', width: '100%', height: '100%' }} />
            ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    Loading page preview...
                </div>
            )}
            <div {...overlayProps} style={{ position: 'absolute', inset: 0, ...overlayProps?.style }}>
                {ready && children}
            </div>
        </div>
    );
}
