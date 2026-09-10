-- One tenant may connect several operational systems. Existing rows remain
-- unchanged; this only replaces the old one-request-per-tenant restriction.
alter table public.crm_integration_requests
  drop constraint if exists crm_integration_requests_tenant_id_key;

create unique index if not exists crm_integration_requests_tenant_provider_key
  on public.crm_integration_requests(tenant_id, provider);

comment on index public.crm_integration_requests_tenant_provider_key is
  'Allows one independently tracked integration request per provider and tenant.';
