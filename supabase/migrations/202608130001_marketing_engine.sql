create type public.marketing_signal_status as enum ('new','shortlisted','dismissed','used');
create type public.marketing_content_status as enum ('idea','draft','review','approved','scheduled','published','failed');
create type public.marketing_platform as enum ('instagram','tiktok','both');

create table public.marketing_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  kind text not null default 'rss' check (kind in ('rss','manual')),
  enabled boolean not null default true,
  weight integer not null default 50 check (weight between 0 and 100),
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.marketing_signals (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.marketing_sources(id) on delete set null,
  external_id text not null,
  title text not null,
  url text,
  summary text,
  published_at timestamptz,
  relevance_score integer not null default 0 check (relevance_score between 0 and 100),
  velocity_score integer not null default 0 check (velocity_score between 0 and 100),
  total_score integer generated always as ((relevance_score * 7 + velocity_score * 3) / 10) stored,
  status public.marketing_signal_status not null default 'new',
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(source_id, external_id)
);

create table public.marketing_content (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid references public.marketing_signals(id) on delete set null,
  platform public.marketing_platform not null default 'both',
  format text not null default 'reel',
  title text not null,
  hook text,
  script text,
  caption text,
  asset_brief text,
  status public.marketing_content_status not null default 'idea',
  scheduled_for timestamptz,
  published_url text,
  estimated_cost_cents integer not null default 0 check (estimated_cost_cents >= 0),
  views integer not null default 0 check (views >= 0),
  saves integer not null default 0 check (saves >= 0),
  shares integer not null default 0 check (shares >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.marketing_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  status text not null check (status in ('running','success','failed')),
  items_processed integer not null default 0,
  estimated_cost_cents integer not null default 0,
  details jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index marketing_signals_score_idx on public.marketing_signals(total_score desc, created_at desc);
create index marketing_content_status_idx on public.marketing_content(status, scheduled_for);
create index marketing_runs_started_idx on public.marketing_runs(started_at desc);

alter table public.marketing_sources enable row level security;
alter table public.marketing_signals enable row level security;
alter table public.marketing_content enable row level security;
alter table public.marketing_runs enable row level security;

create policy marketing_sources_root on public.marketing_sources for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());
create policy marketing_signals_root on public.marketing_signals for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());
create policy marketing_content_root on public.marketing_content for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());
create policy marketing_runs_root on public.marketing_runs for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

insert into public.marketing_sources(name,url,kind,weight) values
  ('Google Trends Казахстан','https://trends.google.com/trending/rss?geo=KZ','rss',85),
  ('Google Trends Россия','https://trends.google.com/trending/rss?geo=RU','rss',55)
on conflict(url) do nothing;
