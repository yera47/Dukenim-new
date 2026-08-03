create or replace function public.create_product_with_variants(p_tenant_id uuid,p_title text,p_description text,p_price integer,p_old_price integer,p_category_id uuid,p_images text[],p_is_active boolean,p_variants jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_product uuid;v_variant jsonb;v_variant_id uuid;v_stock integer;
begin
 if p_tenant_id not in(select public.user_tenant_ids()) and not public.is_superadmin() then raise exception 'Forbidden';end if;
 if p_price<0 or length(trim(p_title))<2 or jsonb_array_length(p_variants)<1 then raise exception 'Invalid product';end if;
 insert into public.products(tenant_id,category_id,title,description,price,old_price,images,is_active) values(p_tenant_id,p_category_id,p_title,p_description,p_price,p_old_price,coalesce(p_images,'{}'),p_is_active) returning id into v_product;
 for v_variant in select*from jsonb_array_elements(p_variants) loop
  v_stock:=greatest(0,(v_variant->>'stock')::integer);
  insert into public.product_variants(product_id,tenant_id,size,color,sku,stock_qty,is_active) values(v_product,p_tenant_id,nullif(v_variant->>'size',''),nullif(v_variant->>'color',''),nullif(v_variant->>'sku',''),0,true) returning id into v_variant_id;
  if v_stock>0 then insert into public.stock_movements(tenant_id,variant_id,delta,reason,staff_id) values(p_tenant_id,v_variant_id,v_stock,'restock',auth.uid());end if;
 end loop;return v_product;
end;$$;
grant execute on function public.create_product_with_variants(uuid,text,text,integer,integer,uuid,text[],boolean,jsonb) to authenticated;

create or replace function public.create_offline_sale(p_tenant_id uuid,p_variant_id uuid,p_qty integer)
returns bigint language plpgsql security invoker set search_path='' as $$
declare v_product record;v_order uuid;v_number bigint;
begin
 if p_tenant_id not in(select public.user_tenant_ids()) and not public.is_superadmin() then raise exception 'Forbidden';end if;
 select p.title,p.price,pv.stock_qty into v_product from public.product_variants pv join public.products p on p.id=pv.product_id where pv.id=p_variant_id and pv.tenant_id=p_tenant_id for update of pv;
 if not found or p_qty<1 or v_product.stock_qty<p_qty then raise exception 'Insufficient stock';end if;
 insert into public.orders(tenant_id,source,status,delivery_cost,subtotal,total,payment_method,payment_status,staff_id) values(p_tenant_id,'offline','done',0,v_product.price*p_qty,v_product.price*p_qty,'offline','paid',auth.uid()) returning id,order_number into v_order,v_number;
 insert into public.order_items(order_id,tenant_id,variant_id,title_snapshot,price_snapshot,qty) values(v_order,p_tenant_id,p_variant_id,v_product.title,v_product.price,p_qty);
 insert into public.stock_movements(tenant_id,variant_id,delta,reason,order_id,staff_id) values(p_tenant_id,p_variant_id,-p_qty,'sale',v_order,auth.uid());return v_number;
end;$$;
grant execute on function public.create_offline_sale(uuid,uuid,integer) to authenticated;
