-- Durable checkout replay protection and a tenant-local catalog lock for the
-- current buyer-order path. Existing RPC signatures remain available.
-- Rollback is application-first: switch the API back to create_buyer_order.
-- This migration is additive, so the table/function may remain dormant while
-- old clients drain. Only after the maximum retry horizon should a separate
-- reviewed cleanup revoke/drop the function and ledger; dropping it earlier
-- would discard replay protection for ambiguous successful orders.
create table public.order_idempotency (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  idempotency_key uuid not null,
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  order_id uuid not null references public.orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tenant_id, idempotency_key),
  unique (tenant_id, order_id)
);

create index order_idempotency_created_idx on public.order_idempotency(created_at);
alter table public.order_idempotency enable row level security;
revoke all on public.order_idempotency from public, anon, authenticated;

create function public.create_buyer_order_idempotent(
  p_tenant_id uuid,
  p_name text,
  p_phone text,
  p_delivery_method text,
  p_delivery_address text,
  p_zone_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_requested_for timestamptz,
  p_user uuid,
  p_guest_hash text,
  p_idempotency_key uuid,
  p_reward_rule uuid default null,
  p_reward_milestone integer default null,
  p_referral_code uuid default null
)
returns table(order_id uuid, order_number integer, total integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_hash text;
  v_existing public.order_idempotency;
  v_created record;
begin
  if p_idempotency_key is null then
    raise exception 'Idempotency key required' using errcode = '22023';
  end if;

  v_request_hash := encode(public.digest(convert_to(jsonb_build_object(
    'tenant_id', p_tenant_id,
    'name', p_name,
    'phone', p_phone,
    'delivery_method', p_delivery_method,
    'delivery_address', p_delivery_address,
    'zone_id', p_zone_id,
    'payment_method', p_payment_method,
    'items', p_items,
    'requested_for', p_requested_for,
    'reward_rule', p_reward_rule,
    'reward_milestone', p_reward_milestone,
    'referral_code', p_referral_code
  )::text, 'UTF8'), 'sha256'), 'hex');

  -- Same tenant/key callers serialize even before the ledger row exists. A
  -- failed transaction leaves no claim, so a caller may safely retry.
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || ':' || p_idempotency_key::text, 0));

  select * into v_existing
  from public.order_idempotency
  where tenant_id = p_tenant_id and idempotency_key = p_idempotency_key;

  if found then
    if v_existing.request_hash <> v_request_hash then
      raise exception 'Idempotency key conflicts with another checkout' using errcode = '22023';
    end if;
    return query
      select o.id, o.order_number::integer, o.total
      from public.orders o
      where o.id = v_existing.order_id and o.tenant_id = p_tenant_id;
    if not found then
      raise exception 'Idempotent order requires reconciliation' using errcode = '55000';
    end if;
    return;
  end if;

  -- Lock the tenant's current product configuration and variants before the
  -- existing order RPC resolves price/options and checks stock. The ordered,
  -- tenant-local lock set prevents price/config snapshots racing merchant
  -- edits and gives concurrent checkouts a consistent lock order.
  perform p.id
  from public.products p
  join public.product_variants v on v.product_id = p.id and v.tenant_id = p_tenant_id
  where p.tenant_id = p_tenant_id
  order by p.id, v.id
  for update of p, v;

  select * into v_created from public.create_buyer_order(
    p_tenant_id, p_name, p_phone, p_delivery_method, p_delivery_address,
    p_zone_id, p_payment_method, p_items, p_requested_for, p_user,
    p_guest_hash, p_reward_rule, p_reward_milestone, p_referral_code
  );

  insert into public.order_idempotency(tenant_id, idempotency_key, request_hash, order_id)
  values(p_tenant_id, p_idempotency_key, v_request_hash, v_created.order_id);

  return query select v_created.order_id::uuid, v_created.order_number::integer, v_created.total::integer;
end
$$;

revoke all on function public.create_buyer_order_idempotent(uuid,text,text,text,text,uuid,text,jsonb,timestamptz,uuid,text,uuid,uuid,integer,uuid) from public, anon, authenticated;
grant execute on function public.create_buyer_order_idempotent(uuid,text,text,text,text,uuid,text,jsonb,timestamptz,uuid,text,uuid,uuid,integer,uuid) to service_role;
