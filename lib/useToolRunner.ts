"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { getErrorMessage, PdfToolError } from './pdf';
import { trackEvent } from './analytics';

export type ToolStatus = 'IDLE' | 'PROCESSING' | 'DONE';

export interface ToolResult {
    url: string;
    filename: string;
    size: number;
}

export interface ToolOutput {
    blob: Blob;
    filename: string;
}

/**
 * Shared state machine for every tool page: IDLE -> PROCESSING -> DONE.
 * Owns the result's object URL (revoked on replace, reset and unmount) and
 * reports failures through toasts instead of blocking alert() dialogs.
 */
export function useToolRunner() {
    const { showToast } = useToast();
    const [status, setStatus] = useState<ToolStatus>('IDLE');
    const [progress, setProgress] = useState('');
    const [result, setResult] = useState<ToolResult | null>(null);
    const urlRef = useRef<string | null>(null);

    const revoke = useCallback(() => {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
    }, []);

    useEffect(() => revoke, [revoke]);

    /**
     * Runs a task. If it resolves with output, the tool moves to DONE;
     * if it resolves with nothing, the tool returns to IDLE.
     */
    const run = useCallback(
        async (task: () => Promise<ToolOutput | void>, failureMessage: string) => {
            setStatus('PROCESSING');
            setProgress('');
            try {
                const output = await task();
                if (!output) {
                    setStatus('IDLE');
                    return;
                }
                revoke();
                const url = URL.createObjectURL(output.blob);
                urlRef.current = url;
                setResult({ url, filename: output.filename, size: output.blob.size });
                setStatus('DONE');
                // Which tools are used most (the page path only; nothing about the file).
                trackEvent('tool_used', { tool: window.location.pathname });
            } catch (error) {
                // Expected user-facing problems (wrong password, bad range...) are not bugs.
                if (error instanceof PdfToolError) console.warn(error.message);
                else console.error(failureMessage, error);
                showToast(getErrorMessage(error, failureMessage), 'error');
                setStatus('IDLE');
            }
        },
        [revoke, showToast]
    );

    const reset = useCallback(() => {
        revoke();
        setResult(null);
        setProgress('');
        setStatus('IDLE');
    }, [revoke]);

    const notify = useCallback((message: string) => showToast(message, 'error'), [showToast]);

    return { status, setStatus, progress, setProgress, result, run, reset, notify };
}
