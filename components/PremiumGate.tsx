"use client";
import Link from 'next/link';
import { Crown } from 'lucide-react';
import { usePlan } from './PlanProvider';
import { FEATURES_BY_PLAN, PREMIUM_FEATURES, type PremiumFeature } from '@/lib/plans';

/** Whether the current visitor may use a Premium feature (always true until billing is set up). */
export function usePremiumFeature(feature: PremiumFeature): boolean {
    return FEATURES_BY_PLAN[usePlan().plan].includes(feature);
}

export function PremiumBadge() {
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 12,
                fontWeight: 700,
                padding: '1px 7px',
                borderRadius: 'var(--radius-full)',
                color: 'var(--primary)',
                background: 'var(--primary-subtle)',
                verticalAlign: 'middle',
            }}
        >
            <Crown size={11} /> Premium
        </span>
    );
}

/** Shown in place of a Premium feature for Free users. */
export function UpgradePrompt({ feature }: { feature: PremiumFeature }) {
    const { user } = usePlan();
    return (
        <div
            role="note"
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid color-mix(in srgb, var(--primary) 40%, transparent)',
                background: 'var(--primary-subtle)',
                color: 'var(--text-color)',
            }}
        >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 'var(--text-sm)' }}>
                <Crown size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span>
                    <strong>{PREMIUM_FEATURES[feature]}</strong> is a Premium feature.
                </span>
            </span>
            <Link href={user ? '/pricing' : '/signup?next=%2Fpricing'} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 14, gap: 6 }}>
                <Crown size={16} /> Upgrade
            </Link>
        </div>
    );
}
