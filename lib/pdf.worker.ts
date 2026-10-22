/// <reference lib="webworker" />
/**
 * Background thread for heavy PDF work. Receives { id, op, args }, runs PDF_OPS[op] and
 * replies with the result (bytes are transferred, not copied) or a serialised error.
 */
import { PDF_OPS, type PdfOpName } from './pdfOps';
import { PdfToolError } from './pdf';

interface Request {
    id: number;
    op: PdfOpName;
    args: unknown[];
}

const scope = self as unknown as DedicatedWorkerGlobalScope;

function transferables(value: unknown): Transferable[] {
    if (value instanceof Uint8Array) return [value.buffer as ArrayBuffer];
    if (Array.isArray(value)) return value.flatMap(transferables);
    return [];
}

scope.onmessage = async (event: MessageEvent<Request>) => {
    const { id, op, args } = event.data;
    const progress = (message: string) => scope.postMessage({ id, progress: message });
    try {
        const fn = PDF_OPS[op] as (...a: unknown[]) => Promise<unknown>;
        // Every op accepts an optional trailing progress callback; extra arguments are ignored.
        const result = await fn(...args, progress);
        scope.postMessage({ id, result }, transferables(result));
    } catch (error) {
        const toolError = error instanceof PdfToolError;
        scope.postMessage({
            id,
            error: {
                message: error instanceof Error ? error.message : String(error),
                code: toolError ? error.code : undefined,
                toolError,
            },
        });
    }
};
