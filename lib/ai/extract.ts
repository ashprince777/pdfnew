import { openPdfjsDocument } from '../pdfjs';
import { getPositionedText, groupIntoRows, rowText } from '../textLayout';

export interface ExtractedPdf {
    numPages: number;
    /** Text of each page (index 0 = page 1); empty for pages without a text layer. */
    pages: string[];
}

/** Reads the text layer of every page in reading order. Runs in the browser; nothing is uploaded. */
export async function extractPdfText(file: File, onProgress?: (page: number, total: number) => void): Promise<ExtractedPdf> {
    const doc = await openPdfjsDocument(await file.arrayBuffer());
    try {
        const pages: string[] = [];
        for (let n = 1; n <= doc.numPages; n++) {
            onProgress?.(n, doc.numPages);
            const page = await doc.getPage(n);
            const { items } = await getPositionedText(page);
            const rows = groupIntoRows(items);
            let text = '';
            rows.forEach((row, i) => {
                const prev = rows[i - 1];
                const lineHeight = Math.max(...row.items.map((item) => item.height));
                // A larger vertical gap than a normal line means a new paragraph.
                if (prev) text += row.y - prev.y > lineHeight * 1.8 ? '\n\n' : '\n';
                text += rowText(row.items);
            });
            pages.push(text.trim());
            page.cleanup();
        }
        return { numPages: doc.numPages, pages };
    } finally {
        await doc.destroy();
    }
}

/** Joins the chosen pages (1-based) with [Page N] markers so answers can cite pages. */
export function documentText(extracted: ExtractedPdf, pageNumbers: number[]): string {
    return pageNumbers
        .filter((n) => extracted.pages[n - 1])
        .map((n) => `[Page ${n}]\n${extracted.pages[n - 1]}`)
        .join('\n\n');
}
