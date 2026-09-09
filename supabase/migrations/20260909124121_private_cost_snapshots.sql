-- Private costs are deliberately not columns on public products/order_items.
create table public.variant_costs (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  unit_cost integer check(unit_cost between 0 and 2000000000),
  updated_at timestamptz not null default now()
);
create index variant_costs_tenant on public.variant_costs(tenant_id);
alter table public.variant_costs enable row level security;
revoke all on public.variant_costs from anon,authenticated;
grant select,insert,update on public.variant_costs to authenticated;
grant all on public.variant_costs to service_role;
create policy owner_cost_read on public.variant_costs for select to authenticated using (
  exists(select 1 from public.tenant_users u where u.tenant_id=variant_costs.tenant_id and u.user_id=(select auth.uid()) and u.role='owner')
);
create policy owner_cost_insert on public.variant_costs for insert to authenticated with check (
  exists(select 1 from public.tenant_users u where u.tenant_id=variant_costs.tenant_id and u.user_id=(select auth.uid()) and u.role='owner')
  and exists(select 1 from public.product_variants v where v.id=variant_id and v.tenant_id=variant_costs.tenant_id)
);
create policy owner_cost_update on public.variant_costs for update to authenticated using (
  exists(select 1 from public.tenant_users u where u.tenant_id=variant_costs.tenant_id and u.user_id=(select auth.uid()) and u.role='owner')
) with check (
  exists(select 1 from public.tenant_users u where u.tenant_id=variant_costs.tenant_id and u.user_id=(select auth.uid()) and u.role='owner')
  and exists(select 1 from public.product_variants v where v.id=variant_id and v.tenant_id=variant_costs.tenant_id)
);

create table public.order_item_costs (
  order_item_id uuid primary key references public.order_items(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  unit_cost integer check(unit_cost between 0 and 2000000000),
  qty integer not null check(qty>0),
  unit_price integer not null check(unit_price>=0),
  captured_at timestamptz not null default now()
);
create index order_item_costs_tenant_order on public.order_item_costs(tenant_id,order_id);
create index order_item_costs_order on public.order_item_costs(order_id);
alter table public.order_item_costs enable row level security;
revoke all on public.order_item_costs from anon,authenticated;
grant select on public.order_item_costs to authenticated;
grant all on public.order_item_costs to service_role;
create policy owner_snapshot_read on public.order_item_costs for select to authenticated using (
 exists(select 1 from public.tenant_users u where u.tenant_id=order_item_costs.tenant_id and u.user_id=(select auth.uid()) and u.role='owner')
);

create schema if not exists dukenim_internal;
revoke all on schema dukenim_internal from public,anon,authenticated;
-- Trigger only: public checkout must capture a private cost without reading it.
create function dukenim_internal.capture_order_cost() returns trigger
language plpgsql security definer set search_path='' as $$
declare cost integer;
begin
  select c.unit_cost into cost from public.variant_costs c
    where c.variant_id=new.variant_id and c.tenant_id=new.tenant_id;
  insert into public.order_item_costs(order_item_id,tenant_id,order_id,unit_cost,qty,unit_price)
    values(new.id,new.tenant_id,new.order_id,cost,new.qty,new.price_snapshot);
  return new;
end $$;
revoke all on function dukenim_internal.capture_order_cost() from public,anon,authenticated;
create trigger capture_private_cost after insert on public.order_items
for each row execute function dukenim_internal.capture_order_cost();
-- Historical missing costs stay unknown. Never backfill from today's prices.
