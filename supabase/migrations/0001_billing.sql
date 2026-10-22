-- Subscriptions and payments for MyOnlinePDF Premium (Razorpay).
-- Run once in the Supabase SQL editor (or with `supabase db push`).
--
-- Security model: signed-in users can READ their own rows. Only the server
-- (service-role key, used by the Razorpay webhook/verification routes) can WRITE,
-- so nobody can grant themselves Premium from the browser.

create table if not exists public.subscriptions (
    user_id uuid primary key references auth.users (id) on delete cascade,
    plan text not null default 'free' check (plan in ('free', 'premium')),
    -- Razorpay subscription status: created, authenticated, active, pending, halted, cancelled, completed, expired
    status text not null default 'created',
    billing_interval text check (billing_interval in ('monthly', 'yearly')),
    razorpay_subscription_id text unique,
    current_period_end timestamptz,
    cancel_at_period_end boolean not null default false,
    updated_at timestamptz not null default now()
);

create table if not exists public.payments (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    razorpay_payment_id text not null unique,
    razorpay_subscription_id text,
    razorpay_invoice_id text,
    amount_paise integer not null,
    currency text not null default 'INR',
    status text not null,
    created_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments (user_id, created_at desc);

alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;

drop policy if exists "Users read their own subscription" on public.subscriptions;
create policy "Users read their own subscription" on public.subscriptions
    for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users read their own payments" on public.payments;
create policy "Users read their own payments" on public.payments
    for select to authenticated using ((select auth.uid()) = user_id);

-- No insert/update/delete policies: only the service role (which bypasses RLS) can write.
