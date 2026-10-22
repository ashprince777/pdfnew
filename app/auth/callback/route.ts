import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

/**
 * Landing URL for email confirmation, password-reset links and Google sign-in.
 * Exchanges the one-time code for a session cookie, then continues to `next`.
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const nextParam = searchParams.get('next') ?? '/account';
    // Only allow same-site relative redirects.
    const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/account';

    const supabase = await getSupabaseServer();
    if (supabase && code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) return NextResponse.redirect(`${origin}${next}`);
        // The link was valid (Supabase already confirmed the email or approved the reset), but it was
        // opened in a different browser from the one that asked for it, so no session can be created here.
        if (next === '/reset-password') return NextResponse.redirect(`${origin}/forgot-password?error=browser`);
        return NextResponse.redirect(`${origin}/login?confirmed=1${next !== '/account' ? `&next=${encodeURIComponent(next)}` : ''}`);
    }
    // No code: the link was expired, already used or invalid.
    return NextResponse.redirect(`${origin}/login?error=link`);
}
