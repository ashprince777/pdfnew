"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { isAuthEnabled, isBillingEnabled } from '@/lib/supabase/config';
import { effectivePlan, type SubscriptionRow } from '@/lib/billing/entitlement';
import { getToolLimits, type PlanId, type ToolLimits } from '@/lib/plans';

interface PlanContextValue {
    /** Accounts/billing are configured on this deployment. */
    authEnabled: boolean;
    billingEnabled: boolean;
    loading: boolean;
    user: User | null;
    subscription: SubscriptionRow | null;
    plan: PlanId;
    isPremium: boolean;
    refresh: () => Promise<void>;
    signOut: () => Promise<void>;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: React.ReactNode }) {
    const authEnabled = isAuthEnabled();
    const billingEnabled = isBillingEnabled();
    const [user, setUser] = useState<User | null>(null);
    const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
    const [loading, setLoading] = useState(authEnabled);

    const loadSubscription = useCallback(async (currentUser: User | null) => {
        const supabase = getSupabaseBrowser();
        if (!supabase || !currentUser) {
            setSubscription(null);
            return;
        }
        // Row-level security only returns the signed-in user's own row.
        const { data } = await supabase.from('subscriptions').select('*').eq('user_id', currentUser.id).maybeSingle();
        setSubscription((data as SubscriptionRow | null) ?? null);
    }, []);

    useEffect(() => {
        const supabase = getSupabaseBrowser();
        if (!supabase) return;
        let active = true;
        supabase.auth.getUser().then(async ({ data }) => {
            if (!active) return;
            setUser(data.user ?? null);
            await loadSubscription(data.user ?? null);
            if (active) setLoading(false);
        });
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            void loadSubscription(session?.user ?? null);
        });
        return () => {
            active = false;
            listener.subscription.unsubscribe();
        };
    }, [loadSubscription]);

    const refresh = useCallback(async () => {
        const supabase = getSupabaseBrowser();
        if (!supabase) return;
        const { data } = await supabase.auth.getUser();
        setUser(data.user ?? null);
        await loadSubscription(data.user ?? null);
    }, [loadSubscription]);

    const signOut = useCallback(async () => {
        await getSupabaseBrowser()?.auth.signOut();
        setUser(null);
        setSubscription(null);
    }, []);

    const value = useMemo<PlanContextValue>(() => {
        // Until billing is configured, every visitor gets the full product (the site works as before).
        const plan: PlanId = billingEnabled ? effectivePlan(subscription) : 'premium';
        return { authEnabled, billingEnabled, loading, user, subscription, plan, isPremium: plan === 'premium', refresh, signOut };
    }, [authEnabled, billingEnabled, loading, user, subscription, refresh, signOut]);

    return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
    const context = useContext(PlanContext);
    if (!context) throw new Error('usePlan must be used inside PlanProvider');
    return context;
}

/** Limits for the current page's tool and plan. */
export function useToolLimits(route: string): ToolLimits & { plan: PlanId } {
    const { plan } = usePlan();
    return { ...getToolLimits(route, plan), plan };
}
