/**
 * CPU-heavy PDF operations, written without any DOM access so they can run inside a Web
 * Worker (see lib/pdf.worker.ts) and keep the page responsive on large files.
 * Inputs and outputs are plain bytes so they can be transferred between threads.
 */
import { PDFDocument, degrees } from '@cantoo/pdf-lib';
import { decryptPdf, isPdfEncrypted, loadPdf, PdfToolError, setPageOrder } from './pdf';

export type Progress = (message: string) => void;

export interface ProtectOptions {
    userPassword: string;
    ownerPassword: string;
    allowPrinting: boolean;
    allowCopying: boolean;
    allowEditing: boolean;
}

async function mergePdfs(files: { name: string; bytes: ArrayBuffer }[], progress: Progress): Promise<Uint8Array> {
    const merged = await PDFDocument.create();
    for (let i = 0; i < files.length; i++) {
        progress(`Adding file ${i + 1} of ${files.length}...`);
        let pdf: PDFDocument;
        try {
            pdf = await loadPdf(files[i].bytes);
        } catch (error) {
            if (error instanceof PdfToolError) throw new PdfToolError(`"${files[i].name}": ${error.message}`, error.code);
            throw error;
        }
        const pages = await merged.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
    }
    progress('Saving merged PDF...');
    return merged.save();
}

/** Builds one new PDF per group of 1-based page numbers. */
async function extractPages(bytes: ArrayBuffer, groups: number[][], progress: Progress): Promise<Uint8Array[]> {
    const source = await loadPdf(bytes);
    const outputs: Uint8Array[] = [];
    for (let i = 0; i < groups.length; i++) {
        if (groups.length > 1) progress(`Creating file ${i + 1} of ${groups.length}...`);
        const out = await PDFDocument.create();
        const pages = await out.copyPages(source, groups[i].map((p) => p - 1));
        pages.forEach((page) => out.addPage(page));
        outputs.push(await out.save());
    }
    return outputs;
}

/**
 * Reorders, removes and rotates pages in place (keeps bookmarks, forms and metadata).
 * `pages` lists 1-based original page numbers in their new order, with extra clockwise rotation.
 */
async function arrangePages(bytes: ArrayBuffer, pages: { original: number; rotation: number }[]): Promise<Uint8Array> {
    const doc = await loadPdf(bytes);
    const originals = doc.getPages();
    const ordered = pages.map(({ original, rotation }) => {
        const page = originals[original - 1];
        if (!page) throw new PdfToolError(`Page ${original} does not exist.`);
        if (rotation) page.setRotation(degrees((page.getRotation().angle + rotation) % 360));
        return page;
    });
    setPageOrder(doc, ordered);
    return doc.save();
}

async function protectPdf(bytes: ArrayBuffer, options: ProtectOptions): Promise<Uint8Array> {
    const doc = await loadPdf(bytes);
    if (doc.getPageCount() === 0) throw new PdfToolError('This PDF has no pages.');
    doc.encrypt({
        userPassword: options.userPassword,
        ownerPassword: options.ownerPassword,
        permissions: {
            printing: options.allowPrinting ? 'highResolution' : false,
            copying: options.allowCopying,
            modifying: options.allowEditing,
            annotating: options.allowEditing,
            fillingForms: true,
            contentAccessibility: true,
            documentAssembly: options.allowEditing,
        },
    });
    return doc.save();
}

async function unlockPdf(bytes: ArrayBuffer, password: string): Promise<Uint8Array> {
    if (!(await isPdfEncrypted(bytes))) {
        throw new PdfToolError('This PDF is not password-protected or restricted, so there is nothing to unlock.', 'NOT_ENCRYPTED');
    }
    const doc = await decryptPdf(bytes, password);
    return doc.save();
}

export const PDF_OPS = {
    mergePdfs,
    extractPages,
    arrangePages,
    protectPdf,
    unlockPdf,
};

export type PdfOps = typeof PDF_OPS;
export type PdfOpName = keyof PdfOps;
