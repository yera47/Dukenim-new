-- Atomic AI credit reservation. Apply before enabling credit-gated generation.
alter table public.tenants
  add column if not exists ai_credit_balance integer not null default 0 check (ai_credit_balance >= 0),
  add column if not exists ai_credits_reset_at timestamptz not null default now();

alter table public.ai_studio_generations
  add column if not exists credit_cost integer not null default 1 check (credit_cost > 0);

create or replace function public.reserve_ai_credits(p_tenant_id uuid, p_cost integer, p_monthly_allotment integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_balance integer; v_reset timestamptz;
begin
  if p_cost is null or p_cost < 1 or p_cost > 1000 then raise exception 'Invalid AI credit cost'; end if;
  select ai_credit_balance, ai_credits_reset_at into v_balance, v_reset from public.tenants where id = p_tenant_id for update;
  if not found then raise exception 'Tenant not found'; end if;
  if now() >= v_reset then
    v_balance := v_balance + greatest(coalesce(p_monthly_allotment, 0), 0);
    update public.tenants set ai_credit_balance = v_balance, ai_credits_reset_at = date_trunc('month', now()) + interval '1 month' where id = p_tenant_id;
  end if;
  if v_balance < p_cost then raise exception 'Insufficient AI credits'; end if;
  update public.tenants set ai_credit_balance = ai_credit_balance - p_cost where id = p_tenant_id;
  return v_balance - p_cost;
end; $$;

create or replace function public.refund_ai_credits(p_tenant_id uuid, p_cost integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_balance integer;
begin
  if p_cost is null or p_cost < 1 or p_cost > 1000 then raise exception 'Invalid AI credit cost'; end if;
  update public.tenants set ai_credit_balance = ai_credit_balance + p_cost where id = p_tenant_id returning ai_credit_balance into v_balance;
  if not found then raise exception 'Tenant not found'; end if;
  return v_balance;
end; $$;

revoke all on function public.reserve_ai_credits(uuid, integer, integer) from public;
revoke all on function public.refund_ai_credits(uuid, integer) from public;
grant execute on function public.reserve_ai_credits(uuid, integer, integer) to service_role;
grant execute on function public.refund_ai_credits(uuid, integer) to service_role;

create table if not exists public.ai_credit_purchases (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  polar_order_id text not null unique, credits_granted integer not null check (credits_granted > 0), amount_kzt integer not null default 0, created_at timestamptz not null default now()
);
alter table public.ai_credit_purchases enable row level security;
drop policy if exists ai_credit_purchases_tenant_read on public.ai_credit_purchases;
create policy ai_credit_purchases_tenant_read on public.ai_credit_purchases for select to authenticated using (public.can_manage_tenant(tenant_id) or public.is_superadmin());

create or replace function public.grant_purchased_ai_credits(p_event_id text, p_event_type text, p_payload jsonb, p_tenant_id uuid, p_order_id text, p_credits integer, p_amount_kzt integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare inserted_purchase boolean;
begin
  insert into public.polar_webhook_events(event_id,event_type,payload) values(p_event_id,p_event_type,p_payload) on conflict(event_id) do nothing;
  if not found then return false; end if;
  if p_tenant_id is null or p_credits is null or p_credits < 1 or not exists(select 1 from public.tenants where id=p_tenant_id) then raise exception 'Invalid AI credit purchase'; end if;
  insert into public.ai_credit_purchases(tenant_id,polar_order_id,credits_granted,amount_kzt) values(p_tenant_id,p_order_id,p_credits,greatest(coalesce(p_amount_kzt,0),0)) on conflict(polar_order_id) do nothing;
  inserted_purchase := found;
  if inserted_purchase then update public.tenants set ai_credit_balance=ai_credit_balance+p_credits where id=p_tenant_id; end if;
  return inserted_purchase;
end; $$;
revoke all on function public.grant_purchased_ai_credits(text,text,jsonb,uuid,text,integer,integer) from public;
grant execute on function public.grant_purchased_ai_credits(text,text,jsonb,uuid,text,integer,integer) to service_role;
