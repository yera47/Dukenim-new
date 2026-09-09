alter function public.create_catalog_setup(uuid,text,text,text,uuid,jsonb,jsonb,text) rename to create_catalog_setup_base;
create function public.create_catalog_setup(p_tenant_id uuid,p_name text,p_template text,p_palette text,p_generation_id uuid,p_color_theme jsonb,p_fulfilment jsonb,p_payment_preference text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare reserve boolean:=false; hours integer:=24;
begin
 if p_fulfilment ? 'reservation' then
  if jsonb_typeof(p_fulfilment->'reservation') is distinct from 'boolean' then raise exception 'Invalid reservation setting';end if;
  reserve:=(p_fulfilment->>'reservation')::boolean;
 end if;
 if reserve then
  if coalesce(p_fulfilment->>'holdHours','') !~ '^[0-9]{1,2}$' then raise exception 'Invalid hold duration';end if;
  hours:=(p_fulfilment->>'holdHours')::integer;if hours not between 1 and 72 then raise exception 'Invalid hold duration';end if;
 end if;
 -- Reuse address validation atomically; no intermediate setting is visible outside this transaction.
 perform public.create_catalog_setup_base(p_tenant_id,p_name,p_template,p_palette,p_generation_id,p_color_theme,
 case when reserve then p_fulfilment||jsonb_build_object('pickup',true) else p_fulfilment end,p_payment_preference);
 if reserve then
  update public.tenant_settings set pickup_enabled=(p_fulfilment->>'pickup')::boolean where tenant_id=p_tenant_id;
  insert into public.reservation_settings(tenant_id,enabled,hold_hours,location)
  select p_tenant_id,true,hours,pickup_location from public.tenant_settings where tenant_id=p_tenant_id
  on conflict(tenant_id) do update set enabled=excluded.enabled,hold_hours=excluded.hold_hours,location=excluded.location;
 end if;
 return p_tenant_id;
end $$;
revoke all on function public.create_catalog_setup(uuid,text,text,text,uuid,jsonb,jsonb,text) from public,anon;
grant execute on function public.create_catalog_setup(uuid,text,text,text,uuid,jsonb,jsonb,text) to authenticated;
create or replace function public.publish_catalog(p_tenant_id uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare t public.tenants%rowtype;s public.tenant_settings%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.tenant_users where tenant_id=p_tenant_id and user_id=auth.uid() and role='owner') then raise exception 'Owner required';end if;
 select * into t from public.tenants where id=p_tenant_id for update;
 if not found or (t.status='active' or (t.status='trial' and t.trial_ends_at>now())) is not true then raise exception 'Store inactive';end if;
 if not exists(select 1 from public.products p join public.product_variants v on v.product_id=p.id and v.tenant_id=p.tenant_id where p.tenant_id=p_tenant_id and p.is_active and v.is_active and v.stock_qty>0) then raise exception 'Add an available product';end if;
 select * into s from public.tenant_settings where tenant_id=p_tenant_id;
 if not found or not (s.delivery_enabled or s.pickup_enabled or exists(select 1 from public.reservation_settings rs where rs.tenant_id=p_tenant_id and rs.enabled)) then raise exception 'Receiving method required';end if;
 if s.delivery_enabled and not exists(select 1 from public.delivery_zones where tenant_id=p_tenant_id and is_active) then raise exception 'Delivery zone required';end if;
 if s.pickup_enabled and length(coalesce(s.pickup_location->>'address',''))<5 then raise exception 'Pickup address required';end if;
 update public.tenants set catalog_published=true,catalog_status='ready' where id=p_tenant_id;
 return true;
end $$;
revoke all on function public.publish_catalog(uuid) from public,anon;
grant execute on function public.publish_catalog(uuid) to authenticated;


select cron.schedule('dukenim-reservation-expiry','* * * * *','select dukenim_internal.expire_merchandise_reservations();');
