export const RECENT_TOOLS_KEY = 'pdf_recent_tools';
export const THEME_KEY = 'pdf_theme';
export const CONSENT_KEY = 'cookie-consent';
/** Fired on window when the visitor changes their cookie choice. */
export const CONSENT_EVENT = 'cookie-consent-change';

export type Consent = 'accepted' | 'declined';

export function getConsent(): Consent | null {
    if (typeof window === 'undefined') return null;
    try {
        const value = localStorage.getItem(CONSENT_KEY);
        return value === 'accepted' || value === 'declined' ? value : null;
    } catch {
        return null;
    }
}

export function setConsent(value: Consent): void {
    try {
        localStorage.setItem(CONSENT_KEY, value);
    } catch {
        // Ignore local storage write errors
    }
    window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function getRecentToolHrefs(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(RECENT_TOOLS_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function addRecentToolHref(href: string): void {
    if (typeof window === 'undefined') return;
    try {
        const current = getRecentToolHrefs();
        const updated = [href, ...current.filter((item) => item !== href)].slice(0, 4);
        localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(updated));
    } catch {
        // Ignore local storage write errors
    }
}

export function getStoredTheme(): 'light' | 'dark' | null {
    if (typeof window === 'undefined') return null;
    try {
        const theme = localStorage.getItem(THEME_KEY) || localStorage.getItem('theme');
        return theme === 'dark' || theme === 'light' ? theme : null;
    } catch {
        return null;
    }
}

export function setStoredTheme(theme: 'light' | 'dark'): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(THEME_KEY, theme);
        localStorage.setItem('theme', theme);
    } catch {
        // Ignore local storage write errors
    }
}
