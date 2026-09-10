-- Server-only idempotency ledger for provider objects created from Dukenim data.
-- Customer/order payloads stay in their source tables; this ledger stores only
-- opaque local and provider identifiers plus safe operational state.
create table public.integration_entity_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  provider text not null check (provider in ('planfix')),
  entity_type text not null check (entity_type in ('customer', 'order')),
  entity_id uuid not null,
  provider_object_id text,
  source_version text not null,
  status text not null default 'pending' check (status in ('pending', 'syncing', 'synced', 'failed', 'uncertain')),
  attempts integer not null default 0 check (attempts between 0 and 10),
  claimed_at timestamptz,
  synced_at timestamptz,
  safe_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider, entity_type, entity_id)
);

create index integration_entity_links_connection_status_idx
  on public.integration_entity_links(connection_id, status, updated_at desc);

alter table public.integration_entity_links enable row level security;
revoke all on public.integration_entity_links from anon, authenticated;
grant all on public.integration_entity_links to service_role;

comment on table public.integration_entity_links is
  'Server-only provider object mapping and idempotency state; contains no credentials or copied customer payloads.';
