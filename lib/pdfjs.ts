import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { PdfToolError } from './pdf';

type PdfjsModule = typeof import('pdfjs-dist');

let pdfjsPromise: Promise<PdfjsModule> | null = null;

/**
 * Lazily loads pdf.js in the browser. The worker is served from our own origin
 * (copied into /public by scripts/copy-pdf-worker.mjs), so no third-party CDN is involved.
 */
export function getPdfjs(): Promise<PdfjsModule> {
    if (!pdfjsPromise) {
        pdfjsPromise = import('pdfjs-dist').then((pdfjsLib) => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
            return pdfjsLib;
        });
    }
    return pdfjsPromise;
}

/**
 * Opens a document with pdf.js. The input is copied because pdf.js transfers
 * (detaches) the buffer it is given to the worker.
 */
export async function openPdfjsDocument(
    data: ArrayBuffer | Uint8Array,
    password?: string
): Promise<PDFDocumentProxy> {
    const pdfjsLib = await getPdfjs();
    const bytes = data instanceof Uint8Array ? data.slice() : new Uint8Array(data.slice(0));
    try {
        return await pdfjsLib.getDocument({
            data: bytes,
            password,
            cMapUrl: '/pdfjs/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: '/pdfjs/standard_fonts/',
        }).promise;
    } catch (error) {
        const name = (error as { name?: string })?.name;
        if (name === 'PasswordException') {
            throw new PdfToolError(
                password
                    ? 'Incorrect password. Please check it and try again.'
                    : 'This PDF is password-protected. Remove the password with the Unlock PDF tool first, then try again.',
                'PASSWORD_REQUIRED'
            );
        }
        if (name === 'InvalidPDFException') {
            throw new PdfToolError('This file is not a valid PDF or is too damaged to open.', 'INVALID_PDF');
        }
        throw error;
    }
}

/** Renders one page to a canvas at the given scale (respecting the page's /Rotate). */
export async function renderPageToCanvas(page: PDFPageProxy, scale: number): Promise<HTMLCanvasElement> {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context is not available in this browser.');
    // White background so transparent pages don't turn black when exported as JPEG.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, canvas, viewport }).promise;
    return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: 'image/jpeg' | 'image/png', quality?: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the rendered page.'))),
            type,
            quality
        );
    });
}

/** Frees the memory held by a canvas (important when rendering many pages). */
export function releaseCanvas(canvas: HTMLCanvasElement) {
    canvas.width = 0;
    canvas.height = 0;
}
