create function public.create_buyer_reservation(p_tenant_id uuid,p_request_id uuid,p_name text,p_phone text,p_items jsonb,p_user uuid,p_guest_hash text)
returns table(order_id uuid,order_number integer,total integer,expires_at timestamptz,reservation_status text)
language plpgsql security definer set search_path='' as $$
declare created record; access public.buyer_order_access;
begin
 if p_guest_hash is null or p_guest_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid buyer';end if;
 -- Food with selectable ingredients is prepared via checkout, not a merchandise hold.
 if exists(select 1 from jsonb_array_elements(p_items) i join public.product_variants v on v.id=(i->>'variant_id')::uuid join public.products p on p.id=v.product_id where p.tenant_id=p_tenant_id and (jsonb_array_length(p.food_options->'ingredients')>0 or jsonb_array_length(p.food_options->'groups')>0)) then raise exception 'Use food checkout for configured dish';end if;
 select * into created from public.create_merchandise_reservation(p_tenant_id,p_request_id,p_name,p_phone,p_items);
 select * into access from public.buyer_order_access a where a.order_id=created.order_id;
 if found and access.guest_hash<>p_guest_hash and (p_user is null or access.user_id is distinct from p_user) then raise exception 'Request conflict';end if;
 insert into public.buyer_order_access(order_id,tenant_id,user_id,guest_hash) values(created.order_id,p_tenant_id,p_user,p_guest_hash) on conflict do nothing;
 return query select created.order_id::uuid,created.order_number::integer,created.total::integer,created.expires_at::timestamptz,created.reservation_status::text;
end $$;
revoke all on function public.create_buyer_reservation(uuid,uuid,text,text,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.create_buyer_reservation(uuid,uuid,text,text,jsonb,uuid,text) to service_role;
