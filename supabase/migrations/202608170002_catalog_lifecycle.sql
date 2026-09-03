-- A storefront is an explicit owner-created resource, not a side effect of the first product.
alter table public.tenants
  add column if not exists catalog_name text,
  add column if not exists catalog_status text not null default 'not_started',
  add column if not exists catalog_created_at timestamptz;

alter table public.tenants drop constraint if exists tenants_catalog_status_check;
alter table public.tenants add constraint tenants_catalog_status_check check (catalog_status in ('not_started','building','ready'));

update public.tenants t
set catalog_name = coalesce(t.catalog_name, t.name),
    catalog_status = case when exists (select 1 from public.products p where p.tenant_id = t.id) then 'ready' else 'not_started' end,
    catalog_created_at = case when exists (select 1 from public.products p where p.tenant_id = t.id) then coalesce(t.catalog_created_at, t.created_at) else t.catalog_created_at end
where t.catalog_name is null or t.catalog_status is null;
