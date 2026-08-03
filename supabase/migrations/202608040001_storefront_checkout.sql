create or replace function public.create_storefront_order(
  p_tenant_id uuid,p_name text,p_phone text,p_delivery_method text,p_delivery_address text,
  p_delivery_cost integer,p_payment_method text,p_payment_status public.payment_status,p_items jsonb
) returns table(order_id uuid,order_number bigint,total integer)
language plpgsql security definer set search_path='' as $$
declare v_customer_id uuid;v_order_id uuid;v_subtotal integer:=0;v_number bigint;v_item jsonb;v_variant record;v_qty integer;
begin
  if not exists(select 1 from public.tenants where id=p_tenant_id and status in('active','trial')) then raise exception 'Store unavailable'; end if;
  if length(trim(p_name))<2 or length(regexp_replace(p_phone,'\D','','g'))<10 then raise exception 'Invalid customer'; end if;
  if jsonb_array_length(p_items)=0 then raise exception 'Empty cart'; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty:=greatest(1,least(20,(v_item->>'qty')::integer));
    select pv.id,pv.stock_qty,p.title,p.price into v_variant from public.product_variants pv join public.products p on p.id=pv.product_id
    where pv.id=(v_item->>'variant_id')::uuid and pv.tenant_id=p_tenant_id and pv.is_active and p.is_active for update of pv;
    if not found or v_variant.stock_qty<v_qty then raise exception 'Variant unavailable'; end if;
    v_subtotal:=v_subtotal+(v_variant.price*v_qty);
  end loop;
  insert into public.customers(tenant_id,phone,name,first_order,last_order) values(p_tenant_id,p_phone,p_name,now(),now())
  on conflict(tenant_id,phone) do update set name=excluded.name,last_order=now() returning id into v_customer_id;
  insert into public.orders(tenant_id,customer_id,source,status,delivery_method,delivery_address,delivery_cost,subtotal,total,payment_method,payment_status)
  values(p_tenant_id,v_customer_id,'online','new',p_delivery_method,p_delivery_address,greatest(p_delivery_cost,0),v_subtotal,v_subtotal+greatest(p_delivery_cost,0),p_payment_method,'pending')
  returning id,public.orders.order_number into v_order_id,v_number;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty:=greatest(1,least(20,(v_item->>'qty')::integer));
    select pv.id,p.title,p.price into v_variant from public.product_variants pv join public.products p on p.id=pv.product_id where pv.id=(v_item->>'variant_id')::uuid and pv.tenant_id=p_tenant_id;
    insert into public.order_items(order_id,tenant_id,variant_id,title_snapshot,price_snapshot,qty) values(v_order_id,p_tenant_id,v_variant.id,v_variant.title,v_variant.price,v_qty);
    insert into public.stock_movements(tenant_id,variant_id,delta,reason,order_id) values(p_tenant_id,v_variant.id,-v_qty,'sale',v_order_id);
  end loop;
  update public.customers set orders_count=orders_count+1,total_spent=total_spent+v_subtotal where id=v_customer_id;
  return query select v_order_id,v_number,v_subtotal+greatest(p_delivery_cost,0);
end;$$;
revoke all on function public.create_storefront_order(uuid,text,text,text,text,integer,text,public.payment_status,jsonb) from public;
grant execute on function public.create_storefront_order(uuid,text,text,text,text,integer,text,public.payment_status,jsonb) to anon,authenticated;
