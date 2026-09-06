-- Cover recent AI and integration foreign keys used by owner/root queries.
create index if not exists ai_credit_purchases_tenant_idx
  on public.ai_credit_purchases (tenant_id);

create index if not exists ai_studio_generations_requested_by_idx
  on public.ai_studio_generations (requested_by)
  where requested_by is not null;

create index if not exists crm_integration_requests_assigned_to_idx
  on public.crm_integration_requests (assigned_to)
  where assigned_to is not null;
