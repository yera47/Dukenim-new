create or replace function public.create_merchandise_reservation(p_tenant_id uuid,p_request_id uuid,p_name text,p_phone text,p_items jsonb)
returns table(order_id uuid,order_number integer,total integer,expires_at timestamptz,reservation_status text)
language plpgsql security definer set search_path='' as $$
declare r public.merchandise_reservations%rowtype; s public.reservation_settings%rowtype; result record; v_phone text; v_fingerprint jsonb;
begin
 if p_request_id is null or p_tenant_id is null then raise exception 'Request id required';end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Invalid cart';end if;
 v_phone:=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
 if length(v_phone) not between 7 and 15 then raise exception 'Invalid customer';end if;
 select jsonb_build_object('name',trim(p_name),'phone',v_phone,'items',jsonb_agg(item order by item->>'variant_id')) into v_fingerprint from jsonb_array_elements(p_items) item;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text||p_request_id::text,991));
 select * into r from public.merchandise_reservations m where m.tenant_id=p_tenant_id and m.request_id=p_request_id;
 if found then
  if r.fingerprint is distinct from v_fingerprint then raise exception 'Request conflict';end if;
  return query select o.id,o.order_number::integer,o.total,r.expires_at,r.status from public.orders o where o.id=r.order_id;
  return;
 end if;
 select * into s from public.reservation_settings where tenant_id=p_tenant_id and enabled;
 if not found or not public.is_storefront_public(p_tenant_id) then raise exception 'Reservation unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text||v_phone,992));
 if (select count(*) from public.merchandise_reservations m where m.tenant_id=p_tenant_id and m.phone=v_phone and m.created_at>now()-interval '1 day')>=10
 or (select count(*) from public.merchandise_reservations m where m.tenant_id=p_tenant_id and m.phone=v_phone and m.status in ('reserved','confirmed') and m.expires_at>now())>=3 then raise exception 'Reservation limit';end if;
 select * into result from dukenim_internal.create_reserved_order(p_tenant_id,p_name,v_phone,'pickup','',null,'cash',p_items);
 insert into public.merchandise_reservations(order_id,tenant_id,request_id,fingerprint,phone,expires_at)
 values(result.order_id,p_tenant_id,p_request_id,v_fingerprint,v_phone,now()+make_interval(hours=>s.hold_hours)) returning * into r;
 return query select result.order_id,result.order_number,result.total,r.expires_at,r.status;
end $$;
revoke all on function public.create_merchandise_reservation(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_merchandise_reservation(uuid,uuid,text,text,jsonb) to service_role;
