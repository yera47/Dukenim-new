-- CRM integrations are requests first. Secrets never live in this table: only a future
-- server-side vault reference may be stored after an approved technical preflight.
create type public.crm_integration_status as enum (
  'not_selected', 'details_later', 'credentials_needed', 'submitted',
  'preflight', 'waiting_owner', 'connected', 'failed', 'revoked'
);

create table public.crm_integration_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  provider text not null default 'not_selected',
  account_url text,
  admin_contact text,
  sync_direction text not null default 'orders_and_customers',
  notes text,
  status public.crm_integration_status not null default 'not_selected',
  preflight_summary text,
  safe_error text,
  secret_reference text,
  assigned_to uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  last_status_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_integration_requests_provider_check check (provider in ('not_selected', 'bitrix24', 'kommo', 'moysklad', 'retailcrm', 'one_c', 'other')),
  constraint crm_integration_requests_sync_check check (sync_direction in ('orders_and_customers', 'orders_only', 'stock_and_products', 'consultation'))
);

create index crm_integration_requests_status_idx on public.crm_integration_requests(status, updated_at desc);
create index crm_integration_requests_tenant_idx on public.crm_integration_requests(tenant_id);

create or replace function public.can_manage_tenant(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_superadmin() or exists (
    select 1 from public.tenant_users tu
    where tu.tenant_id = p_tenant_id and tu.user_id = auth.uid() and tu.role in ('owner', 'admin')
  );
$$;
revoke all on function public.can_manage_tenant(uuid) from public;
grant execute on function public.can_manage_tenant(uuid) to authenticated;

alter table public.crm_integration_requests enable row level security;
create policy crm_integration_requests_read on public.crm_integration_requests
  for select to authenticated using (public.can_manage_tenant(tenant_id));
create policy crm_integration_requests_insert on public.crm_integration_requests
  for insert to authenticated with check (public.can_manage_tenant(tenant_id));
create policy crm_integration_requests_update on public.crm_integration_requests
  for update to authenticated using (public.can_manage_tenant(tenant_id)) with check (public.can_manage_tenant(tenant_id));

-- Root may operate the queue. Client-facing data never exposes secret_reference.
create policy crm_integration_requests_root_delete on public.crm_integration_requests
  for delete to authenticated using (public.is_superadmin());
