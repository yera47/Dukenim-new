-- Existing published stores remain visible. Only the new setup explicitly enters private mode.
alter table public.tenants add column catalog_published boolean not null default true;
alter table public.tenant_settings add column payment_setup_preference text not null default 'later'
 check (payment_setup_preference in ('later','freedompay','halyk','kaspi'));

create function public.create_catalog_setup(p_tenant_id uuid,p_name text,p_template text,p_palette text,p_generation_id uuid,p_color_theme jsonb,p_fulfilment jsonb,p_payment_preference text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare delivery boolean; pickup boolean; delivery_cost bigint;
begin
 if jsonb_typeof(p_fulfilment) is distinct from 'object' or jsonb_typeof(p_fulfilment->'delivery') is distinct from 'boolean' or jsonb_typeof(p_fulfilment->'pickup') is distinct from 'boolean' then raise exception 'Invalid fulfilment';end if;
 delivery:=(p_fulfilment->>'delivery')::boolean;pickup:=(p_fulfilment->>'pickup')::boolean;
 if not delivery and not pickup then raise exception 'Delivery or pickup required';end if;
 if delivery then
  if (length(trim(p_fulfilment->>'zone')) between 2 and 100 and length(trim(p_fulfilment->>'eta')) between 2 and 200 and (p_fulfilment->>'cost') ~ '^[0-9]{1,10}$') is not true then raise exception 'Invalid delivery';end if;
  delivery_cost:=(p_fulfilment->>'cost')::bigint;
  if delivery_cost>2000000000 then raise exception 'Invalid delivery cost';end if;
 end if;
 if pickup and (length(trim(p_fulfilment->>'address')) between 5 and 300 and length(trim(p_fulfilment->>'hours')) between 2 and 200 and length(trim(p_fulfilment->>'preparation')) between 2 and 200) is not true then raise exception 'Invalid pickup';end if;
 if p_payment_preference is null or p_payment_preference not in ('later','freedompay','halyk','kaspi') then raise exception 'Invalid payment preference';end if;
 perform public.create_catalog_with_theme(p_tenant_id,p_name,p_template,p_palette,p_generation_id,p_color_theme);
 update public.tenants set catalog_published=false where id=p_tenant_id;
 -- This is a connection preference, never a payment activation or credential change.
 update public.tenant_settings set delivery_enabled=delivery,pickup_enabled=pickup,payment_setup_preference=p_payment_preference,
 pickup_location=case when pickup then jsonb_build_object('address',trim(p_fulfilment->>'address'),'hours',trim(p_fulfilment->>'hours'),'preparation',trim(p_fulfilment->>'preparation'),'instructions','','gisUrl',coalesce(p_fulfilment->>'gisUrl',''),'yandexUrl',coalesce(p_fulfilment->>'yandexUrl',''),'embedUrl','') else pickup_location end
 where tenant_id=p_tenant_id;
 if not found then raise exception 'Settings not saved';end if;
 if delivery then
  insert into public.delivery_zones(tenant_id,name,cost,eta_text,is_active) values(p_tenant_id,trim(p_fulfilment->>'zone'),delivery_cost::integer,trim(p_fulfilment->>'eta'),true);
 end if;
 return p_tenant_id;
end $$;
revoke all on function public.create_catalog_setup(uuid,text,text,text,uuid,jsonb,jsonb,text) from public,anon;
grant execute on function public.create_catalog_setup(uuid,text,text,text,uuid,jsonb,jsonb,text) to authenticated;

create or replace function public.is_storefront_public(p_tenant_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.tenants t where t.id=p_tenant_id and t.catalog_published and (t.status='active' or (t.status='trial' and t.trial_ends_at>now())));
$$;
drop policy if exists tenants_public_read on public.tenants;
create policy tenants_public_read on public.tenants for select using (
 (catalog_published and (status='active' or (status='trial' and trial_ends_at>now())))
 or id in (select public.user_tenant_ids()) or public.is_superadmin()
);

create function public.publish_catalog(p_tenant_id uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare t public.tenants%rowtype;s public.tenant_settings%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.tenant_users where tenant_id=p_tenant_id and user_id=auth.uid() and role='owner') then raise exception 'Owner required';end if;
 select * into t from public.tenants where id=p_tenant_id for update;
 if not found or (t.status='active' or (t.status='trial' and t.trial_ends_at>now())) is not true then raise exception 'Store inactive';end if;
 if not exists(select 1 from public.products p join public.product_variants v on v.product_id=p.id and v.tenant_id=p.tenant_id where p.tenant_id=p_tenant_id and p.is_active and v.is_active and v.stock_qty>0) then raise exception 'Add an available product';end if;
 select * into s from public.tenant_settings where tenant_id=p_tenant_id;
 if not found or not (s.delivery_enabled or s.pickup_enabled) then raise exception 'Receiving method required';end if;
 if s.delivery_enabled and not exists(select 1 from public.delivery_zones where tenant_id=p_tenant_id and is_active) then raise exception 'Delivery zone required';end if;
 if s.pickup_enabled and length(coalesce(s.pickup_location->>'address',''))<5 then raise exception 'Pickup address required';end if;
 update public.tenants set catalog_published=true,catalog_status='ready' where id=p_tenant_id;
 return true;
end $$;
revoke all on function public.publish_catalog(uuid) from public,anon;
grant execute on function public.publish_catalog(uuid) to authenticated;

create function dukenim_internal.require_published_order() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.source='online' and not public.is_storefront_public(new.tenant_id) then raise exception 'Store is not published';end if;
 return new;
end $$;
revoke all on function dukenim_internal.require_published_order() from public,anon,authenticated;
create trigger require_published_order before insert on public.orders for each row execute function dukenim_internal.require_published_order();
