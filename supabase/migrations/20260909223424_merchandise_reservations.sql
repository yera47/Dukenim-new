-- Reservations are disabled until a merchant explicitly saves complete settings.
create table public.reservation_settings (
 tenant_id uuid primary key references public.tenants(id) on delete cascade,
 enabled boolean not null default false,
 hold_hours integer not null default 24 check(hold_hours between 1 and 72),
 location jsonb not null default '{}'::jsonb,
 check(jsonb_typeof(location)='object' and octet_length(location::text)<12000),
 check(not enabled or (length(coalesce(location->>'address','')) between 5 and 300 and length(coalesce(location->>'hours','')) between 2 and 200))
);
alter table public.reservation_settings enable row level security;
revoke all on public.reservation_settings from anon,authenticated;
grant select,insert,update on public.reservation_settings to authenticated;
grant all on public.reservation_settings to service_role;
create policy reservation_settings_owner on public.reservation_settings for all to authenticated
using (exists(select 1 from public.tenant_users u where u.tenant_id=reservation_settings.tenant_id and u.user_id=(select auth.uid()) and u.role='owner'))
with check (exists(select 1 from public.tenant_users u where u.tenant_id=reservation_settings.tenant_id and u.user_id=(select auth.uid()) and u.role='owner'));

create table public.merchandise_reservations(
 order_id uuid primary key references public.orders(id) on delete cascade,
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 request_id uuid not null,
 fingerprint jsonb not null,
 phone text not null,
 status text not null default 'reserved' check(status in ('reserved','confirmed','collected','cancelled','expired')),
 expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,request_id)
);
create index reservation_expiry on public.merchandise_reservations(expires_at,order_id) where status in ('reserved','confirmed');
create index reservation_owner_list on public.merchandise_reservations(tenant_id,created_at desc);
create index reservation_phone_limit on public.merchandise_reservations(tenant_id,phone,created_at desc);
alter table public.merchandise_reservations enable row level security;
revoke all on public.merchandise_reservations from anon,authenticated;
grant select on public.merchandise_reservations to authenticated;
grant all on public.merchandise_reservations to service_role;
create policy reservations_owner_read on public.merchandise_reservations for select to authenticated using
(exists(select 1 from public.tenant_users u where u.tenant_id=merchandise_reservations.tenant_id and u.user_id=(select auth.uid()) and u.role='owner'));

create or replace function dukenim_internal.create_reserved_order(
  p_tenant_id uuid,
  p_name text,
  p_phone text,
  p_delivery_method text,
  p_delivery_address text,
  p_zone_id uuid,
  p_payment_method text,
  p_items jsonb
)
returns table(order_id uuid, order_number integer, total integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_order_id uuid;
  v_subtotal integer := 0;
  v_number integer;
  v_item jsonb;
  v_variant record;
  v_qty integer;
  v_seen uuid[] := '{}';
  v_variant_id uuid;
  v_delivery_enabled boolean := false;
  v_pickup_enabled boolean := true;
  v_min_order integer := 0;
  v_delivery_cost integer := 0;
  v_zone record;
  v_pickup_location jsonb;
  v_fulfilment_snapshot jsonb;
begin
  if not exists (
    select 1 from public.tenants
    where id = p_tenant_id
      and (status = 'active' or (status = 'trial' and trial_ends_at > now()))
  ) then raise exception 'Store unavailable'; end if;

  select coalesce(delivery_enabled, false), coalesce(pickup_enabled, true), greatest(coalesce(min_order, 0), 0)
  into v_delivery_enabled, v_pickup_enabled, v_min_order
  from public.tenant_settings where tenant_id = p_tenant_id;
  if not found then
    raise exception 'Store settings unavailable';
  end if;

  select location into v_pickup_location from public.reservation_settings where tenant_id=p_tenant_id and enabled;
  if not found then raise exception 'Reservation unavailable'; end if;

  if length(trim(coalesce(p_name, ''))) < 2 or length(trim(p_name)) > 80
    or length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 7
    or length(p_phone) > 30 then raise exception 'Invalid customer'; end if;
  if p_delivery_method is null or p_delivery_method not in ('pickup', 'courier') then raise exception 'Invalid delivery method'; end if;
  if p_delivery_method <> 'pickup' then raise exception 'Reservation requires pickup'; end if;
  if p_delivery_method = 'courier' and not v_delivery_enabled then raise exception 'Delivery unavailable'; end if;
  if p_delivery_method = 'courier' and (length(trim(coalesce(p_delivery_address, ''))) < 4 or length(p_delivery_address) > 500) then raise exception 'Invalid delivery address'; end if;
  if p_payment_method is distinct from 'cash' then raise exception 'Payment method unavailable'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'Invalid cart'; end if;

  -- Lock prices before inventory; stable ordering prevents multi-product lock inversion.
  perform p.id from public.products p where p.tenant_id=p_tenant_id and p.id in
    (select pv.product_id from public.product_variants pv where pv.id::text in (select item->>'variant_id' from jsonb_array_elements(p_items) item)) order by p.id for update;
  for v_item in select * from jsonb_array_elements(p_items) order by value->>'variant_id' loop
    if coalesce(v_item->>'variant_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(v_item->>'qty', '') !~ '^[0-9]{1,2}$' then raise exception 'Invalid cart item'; end if;
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_qty := (v_item->>'qty')::integer;
    if v_qty < 1 or v_qty > 20 or v_variant_id = any(v_seen) then raise exception 'Invalid cart item'; end if;
    v_seen := array_append(v_seen, v_variant_id);
    select pv.id, pv.stock_qty, p.title, p.price into v_variant
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = v_variant_id and pv.tenant_id = p_tenant_id and pv.is_active and p.is_active
    for update of pv;
    if not found or v_variant.stock_qty < v_qty then raise exception 'Variant unavailable'; end if;
    v_subtotal := v_subtotal + (v_variant.price * v_qty);
  end loop;

  if v_subtotal < v_min_order then raise exception 'Minimum order not reached'; end if;
  if p_delivery_method = 'courier' then
    select id, name, cost, free_from, eta_text into v_zone
    from public.delivery_zones
    where id = p_zone_id and tenant_id = p_tenant_id and is_active;
    if not found then raise exception 'Delivery zone unavailable'; end if;
    v_delivery_cost := case when v_zone.free_from is not null and v_subtotal >= v_zone.free_from then 0 else greatest(v_zone.cost, 0) end;
  end if;

  v_fulfilment_snapshot := jsonb_build_object(
    'version', 1, 'reservation', true, 'method', p_delivery_method, 'cost', v_delivery_cost,
    'pickup', case when p_delivery_method = 'pickup' then v_pickup_location else null end,
    'address', case when p_delivery_method = 'courier' then trim(p_delivery_address) else null end
  );
  if p_delivery_method = 'courier' then
    v_fulfilment_snapshot := v_fulfilment_snapshot || jsonb_build_object('zone', to_jsonb(v_zone));
  end if;

  insert into public.customers (tenant_id, phone, name, first_order, last_order)
  values (p_tenant_id, trim(p_phone), trim(p_name), now(), now())
  on conflict (tenant_id, phone) do update set name = excluded.name, last_order = now()
  returning id into v_customer_id;

  insert into public.orders (tenant_id, customer_id, source, status, delivery_method, delivery_address, delivery_cost, subtotal, total, payment_method, payment_status, fulfilment_snapshot)
  values (p_tenant_id, v_customer_id, 'online', 'new', p_delivery_method::public.delivery_method, nullif(trim(p_delivery_address), ''), v_delivery_cost, v_subtotal, v_subtotal + v_delivery_cost, p_payment_method::public.payment_method, 'pending', v_fulfilment_snapshot)
  returning id, public.orders.order_number into v_order_id, v_number;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_qty := (v_item->>'qty')::integer;
    select pv.id, p.title, p.price into v_variant
    from public.product_variants pv join public.products p on p.id = pv.product_id
    where pv.id = v_variant_id and pv.tenant_id = p_tenant_id;
    insert into public.order_items (order_id, tenant_id, variant_id, title_snapshot, price_snapshot, qty)
    values (v_order_id, p_tenant_id, v_variant.id, v_variant.title, v_variant.price, v_qty);
    insert into public.stock_movements (tenant_id, variant_id, delta, reason, order_id)
    values (p_tenant_id, v_variant.id, -v_qty, 'sale', v_order_id);
  end loop;

  -- Reservation is not a sale: paid customer totals are updated only on collection.

  return query select v_order_id, v_number, v_subtotal + v_delivery_cost;
end;
$$;



revoke all on function dukenim_internal.create_reserved_order(uuid,text,text,text,text,uuid,text,jsonb) from public,anon,authenticated,service_role;

create function public.create_merchandise_reservation(p_tenant_id uuid,p_request_id uuid,p_name text,p_phone text,p_items jsonb)
returns table(order_id uuid,order_number integer,total integer,expires_at timestamptz,reservation_status text)
language plpgsql security definer set search_path='' as $$
declare r public.merchandise_reservations%rowtype; s public.reservation_settings%rowtype; result record; phone text; fingerprint jsonb;
begin
 if p_request_id is null or p_tenant_id is null then raise exception 'Request id required';end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Invalid cart';end if;
 phone:=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
 if length(phone) not between 7 and 15 then raise exception 'Invalid customer';end if;
 select jsonb_build_object('name',trim(p_name),'phone',phone,'items',jsonb_agg(item order by item->>'variant_id')) into fingerprint from jsonb_array_elements(p_items) item;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text||p_request_id::text,991));
 select * into r from public.merchandise_reservations m where m.tenant_id=p_tenant_id and m.request_id=p_request_id;
 if found then
  if r.fingerprint is distinct from fingerprint then raise exception 'Request conflict';end if;
  return query select o.id,o.order_number::integer,o.total,r.expires_at,r.status from public.orders o where o.id=r.order_id;
  return;
 end if;
 select * into s from public.reservation_settings where tenant_id=p_tenant_id and enabled;
 if not found or not public.is_storefront_public(p_tenant_id) then raise exception 'Reservation unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text||phone,992));
 if (select count(*) from public.merchandise_reservations m where m.tenant_id=p_tenant_id and m.phone=phone and m.created_at>now()-interval '1 day')>=10
 or (select count(*) from public.merchandise_reservations m where m.tenant_id=p_tenant_id and m.phone=phone and m.status in ('reserved','confirmed') and m.expires_at>now())>=3 then raise exception 'Reservation limit';end if;
 select * into result from dukenim_internal.create_reserved_order(p_tenant_id,p_name,phone,'pickup','',null,'cash',p_items);
 insert into public.merchandise_reservations(order_id,tenant_id,request_id,fingerprint,phone,expires_at)
 values(result.order_id,p_tenant_id,p_request_id,fingerprint,phone,now()+make_interval(hours=>s.hold_hours)) returning * into r;
 return query select result.order_id,result.order_number,result.total,r.expires_at,r.status;
end $$;
revoke all on function public.create_merchandise_reservation(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_merchandise_reservation(uuid,uuid,text,text,jsonb) to service_role;

-- Regular order controls cannot accidentally sell or ship an uncollected reservation.
create function dukenim_internal.guard_reserved_order() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.merchandise_reservations r where r.order_id=old.id and r.status in ('reserved','confirmed'))
 and (new.status is distinct from old.status or new.payment_status is distinct from old.payment_status) then
  raise exception 'Use reservation controls';
 end if;
 return new;
end $$;
revoke all on function dukenim_internal.guard_reserved_order() from public,anon,authenticated;
create trigger guard_reserved_order before update on public.orders for each row execute function dukenim_internal.guard_reserved_order();

create function dukenim_internal.transition_reservation(p_order_id uuid,p_action text)
returns text language plpgsql security definer set search_path='' as $$
declare r public.merchandise_reservations%rowtype; o public.orders%rowtype; target text;
begin
 select * into o from public.orders where id=p_order_id for update;
 select * into r from public.merchandise_reservations where order_id=p_order_id for update;
 if not found then raise exception 'Reservation missing';end if;
 if r.status not in ('reserved','confirmed') then return r.status;end if;
 if r.expires_at<=now() then target:='expired';
 elsif p_action='expire' then return r.status;
 elsif p_action in ('confirm','collect','cancel') then target:=case p_action when 'confirm' then 'confirmed' when 'collect' then 'collected' else 'cancelled' end;
 else raise exception 'Invalid reservation action';end if;
 if target='confirmed' then
  update public.merchandise_reservations set status=target,updated_at=now() where order_id=p_order_id;
  -- Order stays new until collection; the reservation has its own confirmation state.
 else
  update public.merchandise_reservations set status=target,updated_at=now() where order_id=p_order_id;
  if target='collected' then
   update public.orders set status='done',payment_status='paid',payment_method='cash' where id=p_order_id;
   update public.customers set orders_count=orders_count+1,total_spent=total_spent+o.subtotal,last_order=now() where id=o.customer_id;
  else
   update public.orders set status='cancelled' where id=p_order_id;
   -- Existing cancellation trigger restores only net debited stock, once.
  end if;
 end if;
 return target;
end $$;
revoke all on function dukenim_internal.transition_reservation(uuid,text) from public,anon,authenticated,service_role;

create function public.manage_merchandise_reservation(p_order_id uuid,p_action text) returns text language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.merchandise_reservations r join public.tenant_users u on u.tenant_id=r.tenant_id where r.order_id=p_order_id and u.user_id=auth.uid() and u.role='owner') then raise exception 'Owner required';end if;
 if p_action not in ('confirm','collect','cancel') or p_action is null then raise exception 'Invalid action';end if;
 return dukenim_internal.transition_reservation(p_order_id,p_action);
end $$;
revoke all on function public.manage_merchandise_reservation(uuid,text) from public,anon;
grant execute on function public.manage_merchandise_reservation(uuid,text) to authenticated;

create function dukenim_internal.expire_merchandise_reservations() returns integer language plpgsql security definer set search_path='' as $$
declare item record; n integer:=0;
begin
 for item in select o.id from public.orders o join public.merchandise_reservations r on r.order_id=o.id
 where r.status in ('reserved','confirmed') and r.expires_at<=now() order by o.id limit 100 for update of o skip locked loop
  perform dukenim_internal.transition_reservation(item.id,'expire');n:=n+1;
 end loop;
 return n;
end $$;
revoke all on function dukenim_internal.expire_merchandise_reservations() from public,anon,authenticated,service_role;
-- Scheduled separately after transaction tests pass.
