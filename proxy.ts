import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Keeps the Supabase login session fresh (refreshes the auth cookie) and protects /account.
 * Does nothing until accounts are configured.
 */
export async function proxy(request: NextRequest) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return NextResponse.next();

    let response = NextResponse.next({ request });
    const supabase = createServerClient(url, anonKey, {
        cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: (toSet) => {
                toSet.forEach(({ name, value }) => request.cookies.set(name, value));
                response = NextResponse.next({ request });
                toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
            },
        },
    });

    const { data } = await supabase.auth.getUser();
    if (!data.user && request.nextUrl.pathname.startsWith('/account')) {
        const login = request.nextUrl.clone();
        login.pathname = '/login';
        login.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
        return NextResponse.redirect(login);
    }
    return response;
}

export const config = {
    // Only pages that use the session; skip static files, images and the pdf.js/OCR assets.
    matcher: ['/account/:path*', '/pricing', '/login', '/signup', '/api/billing/:path*', '/api/account/:path*'],
};
