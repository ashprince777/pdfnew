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
    }
    return NextResponse.redirect(`${origin}/login?error=link`);
}
