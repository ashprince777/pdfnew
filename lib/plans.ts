/**
 * Plans, prices and limits: the single source of truth for the pricing page,
 * the account page and the per-tool limits.
 *
 * Prices are shown to users from here, but what Razorpay actually charges is set on the
 * Razorpay plans (RAZORPAY_PLAN_MONTHLY / RAZORPAY_PLAN_YEARLY). Keep them in sync.
 */

export type PlanId = 'free' | 'premium';
export type BillingInterval = 'monthly' | 'yearly';

export const PREMIUM_PRICES_INR: Record<BillingInterval, number> = {
    monthly: 299,
    yearly: 1999,
};

export const CURRENCY_SYMBOL = '₹';

/** Length of the free Premium trial for first-time subscribers (card/UPI mandate set up, first charge after it). */
export const TRIAL_DAYS = 7;

/** Effective monthly price of the yearly plan, rounded down. */
export const yearlyPerMonth = () => Math.floor(PREMIUM_PRICES_INR.yearly / 12);
export const yearlySavingPercent = () => Math.round((1 - PREMIUM_PRICES_INR.yearly / (PREMIUM_PRICES_INR.monthly * 12)) * 100);

export interface ToolLimits {
    /** Maximum files per task (for tools that accept several files). */
    maxFiles: number;
    /** Maximum size per file, in MB. */
    maxFileSizeMB: number;
}

/** Defaults for tools not listed below. Everything runs in the browser, so premium limits are bounded by device memory. */
const DEFAULT_LIMITS: Record<PlanId, ToolLimits> = {
    free: { maxFiles: 1, maxFileSizeMB: 50 },
    premium: { maxFiles: 50, maxFileSizeMB: 500 },
};

/** Per-tool overrides, keyed by the tool's route. */
const TOOL_LIMITS: Record<string, Partial<Record<PlanId, Partial<ToolLimits>>>> = {
    '/merge-pdf': { free: { maxFiles: 10, maxFileSizeMB: 50 }, premium: { maxFiles: 200 } },
    '/jpg-to-pdf': { free: { maxFiles: 20, maxFileSizeMB: 25 }, premium: { maxFiles: 200, maxFileSizeMB: 100 } },
    '/compare-pdf': { free: { maxFiles: 2 }, premium: { maxFiles: 2 } },
    '/word-to-pdf': { free: { maxFileSizeMB: 15 }, premium: { maxFileSizeMB: 200 } },
    '/powerpoint-to-pdf': { free: { maxFileSizeMB: 15 }, premium: { maxFileSizeMB: 200 } },
    '/excel-to-pdf': { free: { maxFileSizeMB: 15 }, premium: { maxFileSizeMB: 200 } },
    '/pdf-to-word': { free: { maxFileSizeMB: 15 }, premium: { maxFileSizeMB: 200 } },
    '/pdf-to-powerpoint': { free: { maxFileSizeMB: 15 }, premium: { maxFileSizeMB: 200 } },
    '/pdf-to-excel': { free: { maxFileSizeMB: 15 }, premium: { maxFileSizeMB: 200 } },
    '/html-to-pdf': { free: { maxFileSizeMB: 5 }, premium: { maxFileSizeMB: 50 } },
};

export function getToolLimits(route: string, plan: PlanId): ToolLimits {
    return { ...DEFAULT_LIMITS[plan], ...(TOOL_LIMITS[route]?.[plan] ?? {}) };
}

/** AI requests (summary, chat question or translation) included per calendar month. */
export const AI_CREDITS: Record<PlanId, number> = { free: 3, premium: 200 };

/** Features only available on Premium. */
export type PremiumFeature = 'ocr' | 'pdfa' | 'replace-image' | 'image-watermark';

export const PREMIUM_FEATURES: Record<PremiumFeature, string> = {
    ocr: 'OCR text recognition for scanned PDFs',
    pdfa: 'PDF to PDF/A archiving',
    'replace-image': 'Replacing images in Edit PDF',
    'image-watermark': 'Image watermarks (logos and stamps)',
};

/** Which Premium-tier features each plan includes. */
export const FEATURES_BY_PLAN: Record<PlanId, readonly PremiumFeature[]> = {
    free: [],
    premium: ['ocr', 'pdfa', 'replace-image', 'image-watermark'],
};

/** Rows of the pricing comparison table. */
export const COMPARISON: { label: string; free: string; premium: string }[] = [
    { label: 'All core PDF tools (merge, split, compress, convert, edit, sign…)', free: '✓', premium: '✓' },
    { label: 'Files processed in your browser, never uploaded', free: '✓', premium: '✓' },
    { label: 'Files per task (Merge PDF)', free: '10', premium: '200' },
    { label: 'Images per task (JPG to PDF)', free: '20', premium: '200' },
    { label: 'Max file size (PDF tools)', free: '50 MB', premium: '500 MB' },
    { label: 'Max file size (Office conversions)', free: '15 MB', premium: '200 MB' },
    { label: 'AI credits per month (summarize, chat, translate)', free: String(AI_CREDITS.free), premium: String(AI_CREDITS.premium) },
    { label: 'OCR: edit text in scanned PDFs', free: '—', premium: '✓' },
    { label: 'PDF to PDF/A', free: '—', premium: '✓' },
    { label: 'Replace images in Edit PDF', free: '—', premium: '✓' },
    { label: 'Image watermarks (logo, stamp)', free: '—', premium: '✓' },
    { label: 'Priority email support', free: '—', premium: '✓' },
];
