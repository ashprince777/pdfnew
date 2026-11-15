-- SEO bot "Forum helper": questions people asked on forums, with a drafted answer for the owner to
-- review and post by hand from their own account. Nothing is ever posted automatically.
-- Written only by the server (service role); no policies = no client access.

create table if not exists public.seo_forum_threads (
    id text primary key,
    source text not null check (source in ('reddit', 'manual')),
    url text,
    title text not null,
    body text not null default '',
    community text,
    posted_at timestamptz,
    found_at timestamptz not null default now(),
    -- Search phrase that found it (Reddit) or empty (pasted by the owner).
    query text,
    draft text,
    status text not null default 'new' check (status in ('new', 'posted', 'skipped'))
);
create index if not exists seo_forum_threads_status on public.seo_forum_threads (status, found_at desc);

alter table public.seo_forum_threads enable row level security;
