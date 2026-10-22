-- 7-day free trial for Premium. Run after 0001_billing.sql.
--
-- trial_ends_at: set while a subscription is (or was) in its free trial; the first charge happens then.
-- trial_claims: one row per email address that has started a trial. It is keyed by a hash of the
-- normalised email and is NOT linked to auth.users, so deleting the account and signing up again
-- does not give a second trial. Only the service role can read or write it.

alter table public.subscriptions add column if not exists trial_ends_at timestamptz;

create table if not exists public.trial_claims (
    email_hash text primary key,
    user_id uuid,
    razorpay_subscription_id text,
    claimed_at timestamptz not null default now()
);

alter table public.trial_claims enable row level security;
-- No policies: browsers cannot see or change trial claims.
