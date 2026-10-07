-- LOCAL DRAFT ONLY. Do not apply until privacy notice, consent and retention are approved.
create table if not exists public.product_analytics_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  event_kind text not null check (event_kind in ('session_start','screen_view','action','funnel_step','session_end')),
  platform text not null check (platform in ('web','ios','android')),
  surface text not null check (surface in ('buyer','merchant')),
  session_id text not null check (session_id ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'),
  screen_id text not null check (screen_id ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'),
  action_id text check (action_id is null or action_id ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'),
  funnel_id text check (funnel_id is null or funnel_id ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'),
  step_id text check (step_id is null or step_id ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'),
  layout_version text not null check (layout_version ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'),
  viewport_width integer not null check (viewport_width between 240 and 10000),
  viewport_height integer not null check (viewport_height between 240 and 10000),
  x_milli smallint check (x_milli between 0 and 1000),
  y_milli smallint check (y_milli between 0 and 1000),
  check ((x_milli is null) = (y_milli is null))
);

alter table public.product_analytics_events enable row level security;
revoke all on public.product_analytics_events from anon, authenticated;

-- Collection is intentionally not granted here. Add a narrowly validated ingest RPC
-- only after consent/retention approval; never expose direct INSERT to clients.
create policy "tenant owners read own product analytics"
on public.product_analytics_events for select
to authenticated
using (
  exists (
    select 1 from public.tenant_users tu
    where tu.tenant_id = product_analytics_events.tenant_id
      and tu.user_id = (select auth.uid())
      and tu.role = 'owner'
  )
  or exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.role = 'superadmin'
  )
);

create index if not exists product_analytics_tenant_time_idx on public.product_analytics_events(tenant_id, occurred_at desc);
create index if not exists product_analytics_heatmap_idx on public.product_analytics_events(tenant_id, screen_id, layout_version, viewport_width, viewport_height) where x_milli is not null;

-- Retention must be approved before activation. Proposed default: delete raw events
-- after 90 days and retain only daily tenant-level aggregates without session_id.
