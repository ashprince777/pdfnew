import 'server-only';

/** Comma-separated list of emails allowed into /admin (Vercel env ADMIN_EMAILS). */
export const adminEmails = () =>
    (process.env.ADMIN_EMAILS ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

export const isAdminEmail = (email: string | null | undefined) => Boolean(email && adminEmails().includes(email.toLowerCase()));
