/**
 * Sends a Google Analytics event when GA is loaded (it only loads after the visitor accepts cookies).
 * Never pass file names, document text or other personal data in params.
 */
export function trackEvent(name: string, params: Record<string, string | number> = {}) {
    if (typeof window === 'undefined') return;
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtag === 'function') gtag('event', name, params);
}
