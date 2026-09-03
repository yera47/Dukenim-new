-- The production project was created before these operations were tracked as migrations.
-- Keep creation, stock movement and subscription activation transactional.
create or replace function public.create_storefront_order(p_tenant_id uuid,p_name text,p_phone text,p_delivery_method text,p_delivery_address text,p_delivery_cost integer,p_payment_method text,p_payment_status public.payment_status,p_items jsonb)
returns table(order_id uuid,order_number integer,total integer) language plpgsql security definer set search_path='' as $$
declare v_customer_id uuid;v_order_id uuid;v_subtotal integer:=0;v_number integer;v_item jsonb;v_variant record;v_qty integer;
begin
 if not exists(select 1 from public.tenants where id=p_tenant_id and status in('active','trial')) then raise exception 'Store unavailable';end if;
 if length(trim(p_name))<2 or length(regexp_replace(p_phone,'\D','','g'))<10 then raise exception 'Invalid customer';end if;
 if p_delivery_method not in('pickup','courier') then raise exception 'Invalid delivery method';end if;
 if p_payment_method not in('cash','kaspi','card','online') then raise exception 'Invalid payment method';end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Empty cart';end if;
 for v_item in select * from jsonb_array_elements(p_items) loop
  v_qty:=greatest(1,least(20,coalesce((v_item->>'qty')::integer,0)));
  select pv.id,pv.stock_qty,p.title,p.price into v_variant from public.product_variants pv join public.products p on p.id=pv.product_id where pv.id=(v_item->>'variant_id')::uuid and pv.tenant_id=p_tenant_id and pv.is_active and p.is_active for update of pv;
  if not found or v_variant.stock_qty<v_qty then raise exception 'Variant unavailable';end if;
  v_subtotal:=v_subtotal+(v_variant.price*v_qty);
 end loop;
 insert into public.customers(tenant_id,phone,name,first_order,last_order) values(p_tenant_id,p_phone,trim(p_name),now(),now()) on conflict(tenant_id,phone) do update set name=excluded.name,last_order=now() returning id into v_customer_id;
 insert into public.orders(tenant_id,customer_id,source,status,delivery_method,delivery_address,delivery_cost,subtotal,total,payment_method,payment_status) values(p_tenant_id,v_customer_id,'online','new',p_delivery_method::public.delivery_method,nullif(trim(p_delivery_address),''),greatest(p_delivery_cost,0),v_subtotal,v_subtotal+greatest(p_delivery_cost,0),p_payment_method::public.payment_method,p_payment_status) returning id,public.orders.order_number into v_order_id,v_number;
 for v_item in select * from jsonb_array_elements(p_items) loop
  v_qty:=greatest(1,least(20,coalesce((v_item->>'qty')::integer,0)));
  select pv.id,p.title,p.price into v_variant from public.product_variants pv join public.products p on p.id=pv.product_id where pv.id=(v_item->>'variant_id')::uuid and pv.tenant_id=p_tenant_id;
  insert into public.order_items(order_id,tenant_id,variant_id,title_snapshot,price_snapshot,qty) values(v_order_id,p_tenant_id,v_variant.id,v_variant.title,v_variant.price,v_qty);
  insert into public.stock_movements(tenant_id,variant_id,delta,reason,order_id) values(p_tenant_id,v_variant.id,-v_qty,'sale',v_order_id);
 end loop;
 update public.customers set orders_count=orders_count+1,total_spent=total_spent+v_subtotal where id=v_customer_id;
 return query select v_order_id,v_number,v_subtotal+greatest(p_delivery_cost,0);
end;$$;
revoke all on function public.create_storefront_order(uuid,text,text,text,text,integer,text,public.payment_status,jsonb) from public;
grant execute on function public.create_storefront_order(uuid,text,text,text,text,integer,text,public.payment_status,jsonb) to anon,authenticated;

create or replace function public.create_offline_sale(p_tenant_id uuid,p_variant_id uuid,p_qty integer)
returns integer language plpgsql security invoker set search_path='' as $$
declare v_product record;v_order uuid;v_number integer;
begin
 if p_tenant_id not in(select public.user_tenant_ids()) and not public.is_superadmin() then raise exception 'Forbidden';end if;
 select p.title,p.price,pv.stock_qty into v_product from public.product_variants pv join public.products p on p.id=pv.product_id where pv.id=p_variant_id and pv.tenant_id=p_tenant_id for update of pv;
 if not found or p_qty<1 or v_product.stock_qty<p_qty then raise exception 'Insufficient stock';end if;
 insert into public.orders(tenant_id,source,status,delivery_cost,subtotal,total,payment_method,payment_status,staff_id) values(p_tenant_id,'offline','done',0,v_product.price*p_qty,v_product.price*p_qty,'cash','paid',auth.uid()) returning id,order_number into v_order,v_number;
 insert into public.order_items(order_id,tenant_id,variant_id,title_snapshot,price_snapshot,qty) values(v_order,p_tenant_id,p_variant_id,v_product.title,v_product.price,p_qty);
 insert into public.stock_movements(tenant_id,variant_id,delta,reason,order_id,staff_id) values(p_tenant_id,p_variant_id,-p_qty,'sale',v_order,auth.uid());return v_number;
end;$$;
grant execute on function public.create_offline_sale(uuid,uuid,integer) to authenticated;

create or replace function public.activate_subscription(p_tenant_id uuid,p_plan public.tenant_plan,p_period_end timestamptz)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid;
begin
 if p_tenant_id not in(select public.user_tenant_ids()) and not public.is_superadmin() then raise exception 'Forbidden';end if;
 update public.subscriptions set status='canceled' where tenant_id=p_tenant_id and status='active';
 insert into public.subscriptions(tenant_id,plan,status,started_at,current_period_end) values(p_tenant_id,p_plan,'active',now(),p_period_end) returning id into v_id;
 update public.tenants set plan=p_plan,status='active' where id=p_tenant_id;return v_id;
end;$$;
grant execute on function public.activate_subscription(uuid,public.tenant_plan,timestamptz) to authenticated;
