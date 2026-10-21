import type { PDFPageProxy } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import { getPdfjs } from './pdfjs';

export interface PositionedText {
    str: string;
    /** Left edge, in points from the left of the displayed page. */
    x: number;
    /** Baseline, in points from the top of the displayed page. */
    y: number;
    width: number;
    /** Approximate font size in points. */
    height: number;
    fontName: string;
}

export interface TextRow {
    y: number;
    items: PositionedText[];
}

/** Text items of a page in displayed coordinates (top-left origin, after /Rotate). */
export async function getPositionedText(page: PDFPageProxy): Promise<{ items: PositionedText[]; width: number; height: number }> {
    const { Util } = await getPdfjs();
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const raw: (PositionedText & { quarter: number })[] = [];
    for (const entry of content.items) {
        const item = entry as TextItem;
        if (!('str' in item) || !item.str.trim()) continue;
        const m = Util.transform(viewport.transform, item.transform);
        const height = Math.hypot(m[2], m[3]) || item.height || 10;
        // Reading direction on screen, in quarter turns (0 = left-to-right, 1 = top-to-bottom, ...).
        const quarter = (((Math.round(Math.atan2(m[1], m[0]) / (Math.PI / 2)) % 4) + 4) % 4);
        raw.push({ str: item.str, x: m[4], y: m[5], width: item.width, height, fontName: item.fontName, quarter });
    }

    // Text on rotated pages (or rotated content) runs vertically on screen. Turn the
    // coordinates so the dominant reading direction is left-to-right before grouping lines.
    const counts = [0, 0, 0, 0];
    raw.forEach((item) => counts[item.quarter]++);
    const dominant = counts.indexOf(Math.max(...counts));
    const W = viewport.width;
    const H = viewport.height;
    const turn = (x: number, y: number): [number, number] => {
        switch (dominant) {
            case 1: return [y, W - x];
            case 2: return [W - x, H - y];
            case 3: return [H - y, x];
            default: return [x, y];
        }
    };
    const items: PositionedText[] = raw.map((item) => {
        const [x, y] = turn(item.x, item.y);
        return { str: item.str, x, y, width: item.width, height: item.height, fontName: item.fontName };
    });
    const swapped = dominant % 2 === 1;
    return { items, width: swapped ? H : W, height: swapped ? W : H };
}

/** Groups items into visual lines (tolerant to small baseline differences) sorted top to bottom. */
export function groupIntoRows(items: PositionedText[]): TextRow[] {
    const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
    const rows: TextRow[] = [];
    for (const item of sorted) {
        const row = rows[rows.length - 1];
        if (row && Math.abs(row.y - item.y) <= Math.max(2, item.height * 0.45)) {
            row.items.push(item);
        } else {
            rows.push({ y: item.y, items: [item] });
        }
    }
    rows.forEach((row) => row.items.sort((a, b) => a.x - b.x));
    return rows;
}

/** Joins the items of a row into text, inserting spaces where there are visual gaps. */
export function rowText(items: PositionedText[]): string {
    let text = '';
    let lastRight: number | null = null;
    for (const item of items) {
        if (lastRight !== null && item.x - lastRight > item.height * 0.15 && !text.endsWith(' ') && !item.str.startsWith(' ')) text += ' ';
        text += item.str;
        lastRight = item.x + item.width;
    }
    return text.replace(/\s+/g, ' ').trim();
}

/** Splits a row into cells wherever the horizontal gap is wider than about one character. */
export function splitIntoCells(items: PositionedText[]): { x: number; text: string }[] {
    const cells: { x: number; items: PositionedText[] }[] = [];
    for (const item of items) {
        const cell = cells[cells.length - 1];
        const last = cell?.items[cell.items.length - 1];
        if (cell && last && item.x - (last.x + last.width) < Math.max(4, item.height * 0.9)) {
            cell.items.push(item);
        } else {
            cells.push({ x: item.x, items: [item] });
        }
    }
    return cells.map((cell) => ({ x: cell.x, text: rowText(cell.items) }));
}
