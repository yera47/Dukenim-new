create or replace function public.create_product_with_variants(p_tenant_id uuid,p_title text,p_description text,p_price integer,p_old_price integer,p_category_id uuid,p_images text[],p_is_active boolean,p_variants jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_product uuid;v_variant jsonb;v_variant_id uuid;v_stock integer;
begin
 if p_tenant_id not in(select public.user_tenant_ids()) and not public.is_superadmin() then raise exception 'Forbidden';end if;
 if p_price<0 or length(trim(p_title))<2 or jsonb_array_length(p_variants)<1 then raise exception 'Invalid product';end if;
 if p_category_id is not null and not exists(select 1 from public.categories where id=p_category_id and tenant_id=p_tenant_id) then raise exception 'Invalid category';end if;
 insert into public.products(tenant_id,category_id,title,description,price,old_price,images,is_active) values(p_tenant_id,p_category_id,p_title,p_description,p_price,p_old_price,coalesce(p_images,'{}'),p_is_active) returning id into v_product;
 for v_variant in select*from jsonb_array_elements(p_variants) loop
  v_stock:=greatest(0,(v_variant->>'stock')::integer);
  insert into public.product_variants(product_id,tenant_id,size,color,sku,stock_qty,is_active) values(v_product,p_tenant_id,nullif(v_variant->>'size',''),nullif(v_variant->>'color',''),nullif(v_variant->>'sku',''),0,true) returning id into v_variant_id;
  if v_stock>0 then insert into public.stock_movements(tenant_id,variant_id,delta,reason,staff_id) values(p_tenant_id,v_variant_id,v_stock,'restock',auth.uid());end if;
 end loop;return v_product;
end;$$;

grant execute on function public.create_product_with_variants(uuid,text,text,integer,integer,uuid,text[],boolean,jsonb) to authenticated;
