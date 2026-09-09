-- Server-only OAuth connection records. Token material is encrypted by the application
-- before insertion and this table has no browser-facing RLS policy.
create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null check (provider in ('planfix')),
  account_name text,
  account_domain text not null,
  account_url text not null,
  scopes text[] not null default '{}',
  token_ciphertext text not null,
  access_token_expires_at timestamptz not null,
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  status text not null default 'active' check (status in ('active', 'error', 'revoked')),
  safe_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider)
);

create index integration_connections_status_idx on public.integration_connections(provider, status, updated_at desc);
alter table public.integration_connections enable row level security;
revoke all on public.integration_connections from anon, authenticated;
grant all on public.integration_connections to service_role;

comment on table public.integration_connections is 'Server-only encrypted OAuth connections; never expose token_ciphertext through owner/root queries.';
