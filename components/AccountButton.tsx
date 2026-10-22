"use client";
import Link from 'next/link';
import { Crown, UserRound } from 'lucide-react';
import { usePlan } from './PlanProvider';

/** Navbar entry: Log in / Sign up, or the account link (with a Premium badge). Hidden until accounts are set up. */
export default function AccountButton({ compact = false }: { compact?: boolean }) {
    const { authEnabled, billingEnabled, user, loading, isPremium } = usePlan();
    if (!authEnabled) return null;
    if (loading) return <span style={{ width: compact ? 40 : 150, height: 40, display: 'inline-block' }} aria-hidden="true" />;

    if (user) {
        return (
            <Link
                href="/account"
                aria-label={isPremium && billingEnabled ? 'Your account (Premium)' : 'Your account'}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: compact ? 8 : '8px 14px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-color)',
                    fontWeight: 600,
                    fontSize: 14,
                    whiteSpace: 'nowrap',
                }}
            >
                {isPremium && billingEnabled ? <Crown size={16} style={{ color: 'var(--primary)' }} /> : <UserRound size={16} />}
                {!compact && (isPremium && billingEnabled ? 'Premium' : 'Account')}
            </Link>
        );
    }

    if (compact) {
        return (
            <Link href="/login" aria-label="Log in" style={{ display: 'inline-flex', padding: 8, color: 'var(--text-color)' }}>
                <UserRound size={20} />
            </Link>
        );
    }
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Link href="/login" style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-color)', padding: '8px 6px' }}>
                Log in
            </Link>
            <Link href="/signup" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 14, borderRadius: 'var(--radius-full)' }}>
                Sign up
            </Link>
        </span>
    );
}
