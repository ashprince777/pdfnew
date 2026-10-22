"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { usePlan } from '@/components/PlanProvider';
import styles from './Auth.module.css';

const MIN_PASSWORD = 8;

/** Only same-site relative paths are allowed as post-login destinations. */
function safeNext(value: string | null, fallback = '/account'): string {
    return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}

function friendlyAuthError(message: string): string {
    if (/invalid login credentials/i.test(message)) return 'Incorrect email or password.';
    if (/email not confirmed/i.test(message)) return 'Please confirm your email first. Check your inbox for the link.';
    if (/already registered|already exists/i.test(message)) return 'An account with this email already exists. Try logging in.';
    if (/rate limit/i.test(message)) return 'Too many attempts. Please wait a minute and try again.';
    return message;
}

function NotConfigured() {
    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>Accounts are coming soon</h1>
                <p className={styles.subtitle}>All tools are free to use right now, no account needed.</p>
                <Link href="/all-tools" className="btn btn-primary">Browse tools</Link>
            </div>
        </div>
    );
}

function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
    );
}

function GoogleButton({ next }: { next: string }) {
    const [error, setError] = useState<string | null>(null);
    const signIn = async () => {
        const supabase = getSupabaseBrowser();
        if (!supabase) return;
        const { error: err } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (err) setError(friendlyAuthError(err.message));
    };
    return (
        <>
            <button type="button" className={styles.google} onClick={signIn}>
                <GoogleIcon /> Continue with Google
            </button>
            {error && <p className={styles.error} role="alert">{error}</p>}
        </>
    );
}

export function LoginForm() {
    const { authEnabled, refresh } = usePlan();
    const router = useRouter();
    const params = useSearchParams();
    const next = safeNext(params.get('next'));
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(params.get('error') === 'link' ? 'That link is invalid or has expired. Please try again.' : null);

    if (!authEnabled) return <NotConfigured />;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const supabase = getSupabaseBrowser();
        if (!supabase) return;
        setBusy(true);
        setError(null);
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        setBusy(false);
        if (err) return setError(friendlyAuthError(err.message));
        await refresh();
        router.push(next);
        router.refresh();
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>Log in</h1>
                <p className={styles.subtitle}>Welcome back to PDFAdore</p>
                <GoogleButton next={next} />
                <div className={styles.divider}>or</div>
                <form className={styles.form} onSubmit={submit}>
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="login-email">Email</label>
                        <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={styles.input} />
                    </div>
                    <div className={styles.field}>
                        <div className={styles.labelRow}>
                            <label className={styles.label} htmlFor="login-password">Password</label>
                            <Link href="/forgot-password" className={styles.smallLink}>Forgot password?</Link>
                        </div>
                        <input id="login-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={styles.input} />
                    </div>
                    {error && <p className={styles.error} role="alert">{error}</p>}
                    <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={busy}>
                        {busy ? 'Logging in...' : 'Log in'}
                    </button>
                </form>
                <p className={styles.footer}>
                    New here? <Link href={`/signup${next !== '/account' ? `?next=${encodeURIComponent(next)}` : ''}`} className={styles.link}>Create a free account</Link>
                </p>
            </div>
        </div>
    );
}

export function SignupForm() {
    const { authEnabled, refresh } = usePlan();
    const router = useRouter();
    const params = useSearchParams();
    const next = safeNext(params.get('next'));
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checkEmail, setCheckEmail] = useState(false);

    if (!authEnabled) return <NotConfigured />;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
        const supabase = getSupabaseBrowser();
        if (!supabase) return;
        setBusy(true);
        setError(null);
        const { data, error: err } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: { full_name: name.trim() },
                emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            },
        });
        setBusy(false);
        if (err) return setError(friendlyAuthError(err.message));
        if (!data.session) {
            // Email confirmation is on: the account becomes usable after clicking the link.
            setCheckEmail(true);
            return;
        }
        await refresh();
        router.push(next);
        router.refresh();
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>Create your account</h1>
                <p className={styles.subtitle}>Free forever. Upgrade to Premium anytime.</p>
                {checkEmail ? (
                    <p className={styles.success} role="status">
                        Almost there! We sent a confirmation link to <strong>{email}</strong>. Open it to activate your account.
                    </p>
                ) : (
                    <>
                        <GoogleButton next={next} />
                        <div className={styles.divider}>or</div>
                        <form className={styles.form} onSubmit={submit}>
                            <div className={styles.field}>
                                <label className={styles.label} htmlFor="signup-name">Name</label>
                                <input id="signup-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={styles.input} />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label} htmlFor="signup-email">Email</label>
                                <input id="signup-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={styles.input} />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label} htmlFor="signup-password">Password</label>
                                <input id="signup-password" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={styles.input} />
                            </div>
                            {error && <p className={styles.error} role="alert">{error}</p>}
                            <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={busy}>
                                {busy ? 'Creating account...' : 'Sign up'}
                            </button>
                        </form>
                        <p className={styles.legal}>
                            By signing up you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
                        </p>
                    </>
                )}
                <p className={styles.footer}>
                    Already have an account? <Link href="/login" className={styles.link}>Log in</Link>
                </p>
            </div>
        </div>
    );
}

export function ForgotPasswordForm() {
    const { authEnabled } = usePlan();
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!authEnabled) return <NotConfigured />;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const supabase = getSupabaseBrowser();
        if (!supabase) return;
        setBusy(true);
        setError(null);
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        setBusy(false);
        if (err) return setError(friendlyAuthError(err.message));
        setSent(true);
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>Reset your password</h1>
                {sent ? (
                    <p className={styles.success} role="status">
                        If an account exists for <strong>{email}</strong>, a reset link is on its way. Check your inbox.
                    </p>
                ) : (
                    <form className={styles.form} onSubmit={submit}>
                        <p className={styles.subtitle}>Enter your email and we&apos;ll send you a link to choose a new password.</p>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="forgot-email">Email</label>
                            <input id="forgot-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={styles.input} />
                        </div>
                        {error && <p className={styles.error} role="alert">{error}</p>}
                        <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={busy}>
                            {busy ? 'Sending...' : 'Send reset link'}
                        </button>
                    </form>
                )}
                <p className={styles.footer}>
                    <Link href="/login" className={styles.link}>Back to log in</Link>
                </p>
            </div>
        </div>
    );
}

export function ResetPasswordForm() {
    const { authEnabled, user, loading } = usePlan();
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!authEnabled) return <NotConfigured />;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
        const supabase = getSupabaseBrowser();
        if (!supabase) return;
        setBusy(true);
        setError(null);
        const { error: err } = await supabase.auth.updateUser({ password });
        setBusy(false);
        if (err) return setError(friendlyAuthError(err.message));
        router.push('/account?password=updated');
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>Choose a new password</h1>
                {!loading && !user ? (
                    <p className={styles.error} role="alert">
                        This reset link is invalid or has expired. <Link href="/forgot-password" className={styles.link}>Request a new one</Link>.
                    </p>
                ) : (
                    <form className={styles.form} onSubmit={submit}>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="reset-password">New password</label>
                            <input id="reset-password" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={styles.input} />
                        </div>
                        {error && <p className={styles.error} role="alert">{error}</p>}
                        <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={busy || loading}>
                            {busy ? 'Saving...' : 'Save new password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
