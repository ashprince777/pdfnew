-- Monthly AI credits (Summarize, Chat with PDF, Translate). Run after 0002_free_trial.sql.
--
-- One row per user per calendar month (UTC). Users can read their own usage; only the server
-- (service role) changes it, through the two functions below so concurrent requests can't
-- overspend.

create table if not exists public.ai_usage (
    user_id uuid not null references auth.users (id) on delete cascade,
    month text not null, -- 'YYYY-MM'
    used integer not null default 0 check (used >= 0),
    updated_at timestamptz not null default now(),
    primary key (user_id, month)
);

alter table public.ai_usage enable row level security;

drop policy if exists "Users read their own AI usage" on public.ai_usage;
create policy "Users read their own AI usage" on public.ai_usage
    for select to authenticated using ((select auth.uid()) = user_id);

-- Uses one credit if the user is under p_limit. Returns credits used after this call, or null when
-- the monthly limit is already reached.
create or replace function public.consume_ai_credit(p_user uuid, p_month text, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    new_used integer;
begin
    insert into public.ai_usage as u (user_id, month, used)
    values (p_user, p_month, 1)
    on conflict (user_id, month) do update
        set used = u.used + 1, updated_at = now()
        where u.used < p_limit
    returning used into new_used;
    if new_used is null or new_used > p_limit then
        return null;
    end if;
    return new_used;
end;
$$;

-- Gives a credit back when the AI request failed before producing anything.
create or replace function public.refund_ai_credit(p_user uuid, p_month text)
returns void
language sql
security definer
set search_path = public
as $$
    update public.ai_usage set used = greatest(used - 1, 0), updated_at = now()
    where user_id = p_user and month = p_month;
$$;

revoke all on function public.consume_ai_credit(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.refund_ai_credit(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_ai_credit(uuid, text, integer) to service_role;
grant execute on function public.refund_ai_credit(uuid, text) to service_role;
