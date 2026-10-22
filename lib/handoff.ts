"use client";

/**
 * Hands a result file from one tool to the next ("Continue with another tool") without
 * downloading or uploading it. Lives in memory only, so it survives client-side navigation
 * but disappears on reload; files never leave the browser.
 */
let pending: { file: File; from: string } | null = null;

export function setHandoff(file: File, from: string) {
    pending = { file, from };
}

/** Returns (and clears) the waiting file if this uploader accepts its extension. */
export function takeHandoff(accept: string): { file: File; from: string } | null {
    if (!pending) return null;
    const ext = pending.file.name.split('.').pop()?.toLowerCase() ?? '';
    const accepted = accept === '*/*' || accept.split(',').some((a) => a.trim().toLowerCase().replace(/^\./, '') === ext);
    if (!accepted) return null;
    const value = pending;
    pending = null;
    return value;
}
