-- AI Studio is deliberately a constrained storefront editor, not a general chat.
-- It keeps a tenant-owned audit trail and lets the server enforce daily quotas.

create table if not exists public.ai_studio_generations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  intent text not null check (intent in ('hero', 'promotion', 'catalog_copy')),
  input_summary text not null check (char_length(input_summary) between 2 and 800),
  output jsonb not null,
  model text,
  usage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_studio_generations_tenant_created_idx
  on public.ai_studio_generations(tenant_id, created_at desc);

alter table public.ai_studio_generations enable row level security;

drop policy if exists ai_studio_generations_tenant_read on public.ai_studio_generations;
create policy ai_studio_generations_tenant_read on public.ai_studio_generations
  for select to authenticated
  using (public.can_manage_tenant(tenant_id));

drop policy if exists ai_studio_generations_root_read on public.ai_studio_generations;
create policy ai_studio_generations_root_read on public.ai_studio_generations
  for select to authenticated
  using (public.is_superadmin());
