-- SEO bot: daily search data, automatic title/description changes and Google update notes.
-- Written only by the server (service role). seo_overrides is publicly readable because pages
-- read their live titles from it; everything else is admin-only (no policies = no client access).

create table if not exists public.seo_runs (
    id bigserial primary key,
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    status text not null default 'running' check (status in ('running', 'ok', 'failed')),
    -- Audit issues, keyword gaps and step notes from this run.
    summary jsonb not null default '{}'::jsonb,
    error text
);

-- Google Search Console rows: one per day, search query and page.
create table if not exists public.seo_query_stats (
    day date not null,
    query text not null,
    page text not null,
    clicks integer not null default 0,
    impressions integer not null default 0,
    position real not null default 0,
    primary key (day, query, page)
);
create index if not exists seo_query_stats_page_day on public.seo_query_stats (page, day);

-- Live title/description per path, overriding the defaults in lib/seo.ts.
create table if not exists public.seo_overrides (
    path text primary key,
    title text not null,
    description text not null,
    updated_at timestamptz not null default now()
);

-- Every automatic change, so it can be measured and reverted.
create table if not exists public.seo_changes (
    id bigserial primary key,
    path text not null,
    old_title text not null,
    old_description text not null,
    new_title text not null,
    new_description text not null,
    reason text not null,
    -- Search Console numbers for the page in the 28 days before the change.
    before jsonb not null default '{}'::jsonb,
    after jsonb,
    status text not null default 'live' check (status in ('live', 'kept', 'reverted')),
    note text,
    created_at timestamptz not null default now(),
    evaluated_at timestamptz
);
create index if not exists seo_changes_path on public.seo_changes (path, created_at desc);

-- Google Search ranking updates and Search Central blog posts, with an AI note on what to check.
create table if not exists public.seo_updates (
    id text primary key,
    source text not null check (source in ('status', 'blog')),
    title text not null,
    url text,
    published_at timestamptz,
    ended_at timestamptz,
    note text,
    created_at timestamptz not null default now()
);

-- Keyword ideas from Google autocomplete (India).
create table if not exists public.seo_keywords (
    keyword text primary key,
    seed text not null,
    covered boolean not null default false,
    first_seen date not null default current_date,
    last_seen date not null default current_date
);

alter table public.seo_runs enable row level security;
alter table public.seo_query_stats enable row level security;
alter table public.seo_overrides enable row level security;
alter table public.seo_changes enable row level security;
alter table public.seo_updates enable row level security;
alter table public.seo_keywords enable row level security;

drop policy if exists "seo overrides are public" on public.seo_overrides;
create policy "seo overrides are public" on public.seo_overrides for select to anon, authenticated using (true);
