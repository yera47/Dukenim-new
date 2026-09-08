-- Private work in progress, never queried by the public storefront.
create table public.catalog_builder_drafts (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  revision integer not null default 1 check (revision > 0),
  state jsonb not null check (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 16000),
  updated_at timestamptz not null default now()
);
alter table public.catalog_builder_drafts enable row level security;
revoke all on public.catalog_builder_drafts from anon;
grant select, insert, update on public.catalog_builder_drafts to authenticated;
create policy builder_draft_owner on public.catalog_builder_drafts
  for all to authenticated
  using (exists (select 1 from public.tenant_users membership where membership.tenant_id = catalog_builder_drafts.tenant_id and membership.user_id = (select auth.uid()) and membership.role = 'owner'))
  with check (exists (select 1 from public.tenant_users membership where membership.tenant_id = catalog_builder_drafts.tenant_id and membership.user_id = (select auth.uid()) and membership.role = 'owner'));
