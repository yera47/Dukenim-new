-- Real Polar.sh subscription integration: map tenants/subscriptions to Polar identities and
-- record every processed webhook delivery so retried deliveries never apply an event twice.
-- No Polar secret, product id or customer data is present in this file; it only adds columns
-- and an idempotency ledger. Safe to run against production at any time; it changes no data.

alter table public.tenants
  add column if not exists polar_customer_id text;

alter table public.subscriptions
  add column if not exists polar_subscription_id text,
  add column if not exists polar_product_id text,
  add column if not exists cancel_at_period_end boolean not null default false;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'tenants_polar_customer_id_key'
  ) then
    alter table public.tenants
      add constraint tenants_polar_customer_id_key unique (polar_customer_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_polar_subscription_id_key'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_polar_subscription_id_key unique (polar_subscription_id);
  end if;
end $$;

create table if not exists public.polar_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null check (char_length(event_type) between 1 and 80),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_polar_subscription_idx on public.subscriptions(polar_subscription_id);
create index if not exists tenants_polar_customer_idx on public.tenants(polar_customer_id);
create index if not exists polar_webhook_events_created_idx on public.polar_webhook_events(created_at desc);

alter table public.polar_webhook_events enable row level security;

drop policy if exists polar_webhook_events_root_read on public.polar_webhook_events;
create policy polar_webhook_events_root_read on public.polar_webhook_events
  for select to authenticated
  using (public.is_superadmin());

-- Only the service-role webhook handler writes here; no insert/update policy is granted to
-- authenticated or anon, so application/browser clients cannot forge processed-event rows.
