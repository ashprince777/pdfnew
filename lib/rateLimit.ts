import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit, RATE_LIMITS } from './rateLimitCore';

export { RATE_LIMITS } from './rateLimitCore';

function clientIp(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Returns a 429 response when the caller (signed-in user, or IP when anonymous) is over the
 * limit for this bucket, otherwise null.
 */
export function rateLimitResponse(request: NextRequest, bucket: keyof typeof RATE_LIMITS, userId?: string | null): NextResponse | null {
    const key = `${bucket}:${userId ?? `ip:${clientIp(request)}`}`;
    const { ok, retryAfterSec } = checkRateLimit(key, RATE_LIMITS[bucket]);
    if (ok) return null;
    return NextResponse.json(
        { error: `Too many requests. Please wait ${retryAfterSec} seconds and try again.` },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
    );
}
