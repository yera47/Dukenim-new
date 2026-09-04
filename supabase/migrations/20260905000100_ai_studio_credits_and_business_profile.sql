-- AI Studio opens to both tariffs. The new differentiator is a monthly AI-credit wallet
-- (small, plan-sized, lazily refilled) plus a small paid top-up, instead of a hard Brand-only
-- lock. This migration is additive only: new columns, new tables, new functions. It does not
-- change any existing pricing row, RLS policy semantics, or stock/order invariant.

alter table public.tenants
  add column if not exists business_vertical text
    check (business_vertical is null or business_vertical in ('fashion','beauty','food','flowers','services','event','home','other')),
  add column if not exists storefront_format text not null default 'catalog'
    check (storefront_format in ('catalog','one_page')),
  add column if not exists ai_credit_balance integer not null default 0 check (ai_credit_balance >= 0),
  add column if not exists ai_credits_reset_at timestamptz not null default now();

alter table public.ai_studio_generations
  add column if not exists credit_cost integer not null default 1 check (credit_cost > 0),
  add column if not exists output_type text not null default 'text' check (output_type in ('text','image'));

-- Widen the allowed intents: catalog_structure (text) and banner (image) join the three
-- existing controlled scenarios. Still a fixed, reviewed list — never a free-form chat.
alter table public.ai_studio_generations drop constraint if exists ai_studio_generations_intent_check;
alter table public.ai_studio_generations add constraint ai_studio_generations_intent_check
  check (intent in ('hero','promotion','catalog_copy','catalog_structure','banner'));

-- Monthly plan allotments live in application code (src/lib/plans.ts) so pricing changes
-- don't require a migration. This function only knows how to lazily roll the wallet forward
-- once a monthly cycle has elapsed, then reports the current balance. It never invents an
-- allotment amount itself — the caller (server route, service role only) passes it in.
create or replace function public.refill_and_get_ai_credits(p_tenant_id uuid, p_monthly_allotment integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
  v_reset_at timestamptz;
begin
  select ai_credit_balance, ai_credits_reset_at into v_balance, v_reset_at
  from public.tenants where id = p_tenant_id for update;

  if not found then
    raise exception 'Tenant not found';
  end if;

  if now() >= v_reset_at then
    v_balance := v_balance + greatest(p_monthly_allotment, 0);
    v_reset_at := date_trunc('month', now()) + interval '1 month';
    update public.tenants set ai_credit_balance = v_balance, ai_credits_reset_at = v_reset_at where id = p_tenant_id;
  end if;

  return v_balance;
end;
$$;

revoke all on function public.refill_and_get_ai_credits(uuid, integer) from public;
grant execute on function public.refill_and_get_ai_credits(uuid, integer) to service_role;

create or replace function public.spend_ai_credits(p_tenant_id uuid, p_cost integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
begin
  update public.tenants
  set ai_credit_balance = ai_credit_balance - p_cost
  where id = p_tenant_id and ai_credit_balance >= p_cost
  returning ai_credit_balance into v_balance;

  if not found then
    raise exception 'Insufficient AI credits';
  end if;

  return v_balance;
end;
$$;

revoke all on function public.spend_ai_credits(uuid, integer) from public;
grant execute on function public.spend_ai_credits(uuid, integer) to service_role;

-- Small paid top-up ledger, purchased as a one-time Polar product. Reuses the existing
-- polar_webhook_events table as the idempotency ledger (generic event_id/event_type/payload),
-- so a retried or duplicate Polar delivery can never grant credits twice.
create table if not exists public.ai_credit_purchases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  polar_order_id text not null unique,
  credits_granted integer not null check (credits_granted > 0),
  amount_kzt integer not null check (amount_kzt >= 0),
  created_at timestamptz not null default now()
);

create index if not exists ai_credit_purchases_tenant_created_idx on public.ai_credit_purchases(tenant_id, created_at desc);

alter table public.ai_credit_purchases enable row level security;

drop policy if exists ai_credit_purchases_tenant_read on public.ai_credit_purchases;
create policy ai_credit_purchases_tenant_read on public.ai_credit_purchases
  for select to authenticated
  using (public.can_manage_tenant(tenant_id));

drop policy if exists ai_credit_purchases_root_read on public.ai_credit_purchases;
create policy ai_credit_purchases_root_read on public.ai_credit_purchases
  for select to authenticated
  using (public.is_superadmin());

create or replace function public.grant_purchased_ai_credits(
  p_event_id text,
  p_event_type text,
  p_payload jsonb,
  p_tenant_id uuid,
  p_order_id text,
  p_credits integer,
  p_amount_kzt integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.polar_webhook_events(event_id, event_type, payload)
  values (p_event_id, p_event_type, p_payload)
  on conflict (event_id) do nothing;

  if not found then
    return false;
  end if;

  if p_tenant_id is null or not exists (select 1 from public.tenants where id = p_tenant_id) then
    raise exception 'Unknown tenant for AI credit purchase';
  end if;

  insert into public.ai_credit_purchases(tenant_id, polar_order_id, credits_granted, amount_kzt)
  values (p_tenant_id, p_order_id, p_credits, p_amount_kzt)
  on conflict (polar_order_id) do nothing;

  update public.tenants set ai_credit_balance = ai_credit_balance + p_credits where id = p_tenant_id;

  return true;
end;
$$;

revoke all on function public.grant_purchased_ai_credits(text,text,jsonb,uuid,text,integer,integer) from public;
grant execute on function public.grant_purchased_ai_credits(text,text,jsonb,uuid,text,integer,integer) to service_role;

-- Storage for AI-generated promotional banners, same tenant-folder convention as product-images.
insert into storage.buckets(id, name, public) values('ai-banners', 'ai-banners', true) on conflict(id) do nothing;

drop policy if exists ai_banners_public_read on storage.objects;
create policy ai_banners_public_read on storage.objects
  for select using (bucket_id = 'ai-banners');

drop policy if exists ai_banners_tenant_write on storage.objects;
create policy ai_banners_tenant_write on storage.objects
  for all to authenticated
  using (bucket_id = 'ai-banners' and ((storage.foldername(name))[1]::uuid in (select public.user_tenant_ids()) or public.is_superadmin()))
  with check (bucket_id = 'ai-banners' and ((storage.foldername(name))[1]::uuid in (select public.user_tenant_ids()) or public.is_superadmin()));
