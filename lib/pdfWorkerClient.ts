"use client";
import { PdfToolError } from './pdf';
import type { PdfOpName, PdfOps } from './pdfOps';

type Args<K extends PdfOpName> = Parameters<PdfOps[K]> extends [...infer A, infer Last] ? (Last extends (m: string) => void ? A : Parameters<PdfOps[K]>) : Parameters<PdfOps[K]>;
type Result<K extends PdfOpName> = Awaited<ReturnType<PdfOps[K]>>;

interface Pending {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    onProgress?: (message: string) => void;
}

let worker: Worker | null = null;
let workerFailed = false;
let nextId = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker | null {
    if (workerFailed || typeof Worker === 'undefined') return null;
    if (!worker) {
        try {
            worker = new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' });
        } catch {
            workerFailed = true;
            return null;
        }
        worker.onmessage = (event: MessageEvent) => {
            const { id, progress, result, error } = event.data as {
                id: number;
                progress?: string;
                result?: unknown;
                error?: { message: string; code?: string; toolError: boolean };
            };
            const job = pending.get(id);
            if (!job) return;
            if (progress !== undefined) {
                job.onProgress?.(progress);
                return;
            }
            pending.delete(id);
            if (error) job.reject(error.toolError ? new PdfToolError(error.message, error.code) : new Error(error.message));
            else job.resolve(result);
        };
        worker.onerror = (event) => {
            // The worker script itself failed to load: fall back to the main thread from now on.
            event.preventDefault();
            workerFailed = true;
            worker?.terminate();
            worker = null;
            for (const [id, job] of pending) {
                pending.delete(id);
                job.reject(new Error('WORKER_UNAVAILABLE'));
            }
        };
    }
    return worker;
}

async function runOnMainThread<K extends PdfOpName>(op: K, args: Args<K>, onProgress?: (message: string) => void): Promise<Result<K>> {
    const { PDF_OPS } = await import('./pdfOps');
    const fn = PDF_OPS[op] as (...a: unknown[]) => Promise<Result<K>>;
    return fn(...(args as unknown[]), onProgress ?? (() => {}));
}

/**
 * Runs a heavy PDF operation in a background Web Worker so the page stays responsive.
 * Byte arrays passed in are transferred to the worker (they become unusable here).
 * Falls back to the main thread when workers are unavailable.
 */
export async function runPdfOp<K extends PdfOpName>(op: K, args: Args<K>, onProgress?: (message: string) => void): Promise<Result<K>> {
    const w = getWorker();
    if (!w) return runOnMainThread(op, args, onProgress);

    const transfer: Transferable[] = [];
    const collect = (value: unknown) => {
        if (value instanceof ArrayBuffer) transfer.push(value);
        else if (Array.isArray(value)) value.forEach(collect);
        else if (value && typeof value === 'object') Object.values(value).forEach(collect);
    };
    collect(args);

    const id = ++nextId;
    try {
        return await new Promise<Result<K>>((resolve, reject) => {
            pending.set(id, { resolve: resolve as (v: unknown) => void, reject, onProgress });
            w.postMessage({ id, op, args }, transfer);
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'WORKER_UNAVAILABLE') return runOnMainThread(op, args, onProgress);
        throw error;
    }
}
