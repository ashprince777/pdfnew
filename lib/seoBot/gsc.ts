import 'server-only';
import { createSign } from 'crypto';

/**
 * Google Search Console API with a service account (read-only).
 * Env: GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY (PEM; "\n" escapes allowed), optional GSC_SITE_URL.
 * The service account's email must be added as a user of the property in Search Console.
 */
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

export const isGscConfigured = () => Boolean(process.env.GSC_CLIENT_EMAIL && process.env.GSC_PRIVATE_KEY);
export const gscSite = () => process.env.GSC_SITE_URL || 'sc-domain:pdfadore.com';

const base64url = (value: string | Buffer) => Buffer.from(value).toString('base64url');

async function accessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = base64url(
        JSON.stringify({ iss: process.env.GSC_CLIENT_EMAIL, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })
    );
    const signer = createSign('RSA-SHA256');
    signer.update(`${header}.${claims}`);
    const signature = signer.sign(process.env.GSC_PRIVATE_KEY!.replace(/\\n/g, '\n')).toString('base64url');
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${signature}` }),
    });
    const data = (await res.json()) as { access_token?: string; error_description?: string; error?: string };
    if (!data.access_token) throw new Error(`Search Console login failed: ${data.error_description ?? data.error ?? res.status}`);
    return data.access_token;
}

export interface GscRow {
    keys: string[];
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

export interface GscQuery {
    startDate: string;
    endDate: string;
    dimensions: ('date' | 'query' | 'page')[];
    rowLimit?: number;
}

/** Runs several Search Analytics queries with one login. */
export async function gscQueries(queries: GscQuery[]): Promise<GscRow[][]> {
    const token = await accessToken();
    const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(gscSite())}/searchAnalytics/query`;
    return Promise.all(
        queries.map(async (query) => {
            const res = await fetch(url, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ rowLimit: 25000, dataState: 'all', ...query }),
            });
            const data = (await res.json()) as { rows?: GscRow[]; error?: { message?: string } };
            if (!res.ok) throw new Error(`Search Console: ${data.error?.message ?? res.status}`);
            return data.rows ?? [];
        })
    );
}

/** YYYY-MM-DD for `daysAgo` days before today (UTC). */
export const isoDay = (daysAgo = 0) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
