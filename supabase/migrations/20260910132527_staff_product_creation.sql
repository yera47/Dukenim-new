-- Separate staff operation. Never adds broad tenant membership.
create function public.staff_create_product(p_access uuid,p_request uuid,p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare member public.staff_access; product_id uuid; variant_id uuid; image text; image_path text;
begin
 select * into member from public.staff_access where id=p_access and user_id=auth.uid() and active for share;
 if member.id is null or member.permissions->>'catalog' is distinct from 'write' then raise exception 'Access denied' using errcode='42501';end if;
 perform 1 from public.tenants where id=member.tenant_id and catalog_status<>'not_started' and (status='active' or (status='trial' and trial_ends_at>now())) for update;
 if not found then raise exception 'Store unavailable' using errcode='42501';end if;
 -- Deterministic product ID makes a retry safe; tenant remains server-derived.
 select id into product_id from public.products where id=p_request and tenant_id=member.tenant_id;
 if product_id is not null then return product_id;end if;
 if (length(trim(p_data->>'title')) between 2 and 200 and length(coalesce(p_data->>'description',''))<=4000 and (p_data->>'price')~'^[0-9]{1,10}$' and (p_data->>'stock')~'^[0-9]{1,7}$') is not true then raise exception 'Invalid product';end if;
 if (p_data->>'price')::bigint>2000000000 or (p_data->>'stock')::int>1000000 then raise exception 'Invalid amount';end if;
 if (p_data->>'stock')::int>0 and member.permissions->>'stock' is distinct from 'write' then raise exception 'Stock permission required' using errcode='42501';end if;
 if jsonb_typeof(p_data->'images') is distinct from 'array' or jsonb_array_length(p_data->'images')>4 then raise exception 'Invalid images';end if;
 for image in select jsonb_array_elements_text(p_data->'images') loop
  if image !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/product-images/' then raise exception 'Invalid image URL';end if;
  image_path:=split_part(image,'/storage/v1/object/public/product-images/',2);
  if image_path not like member.tenant_id::text||'/staff/'||auth.uid()::text||'/'||p_request::text||'/%'
    or not exists(select 1 from storage.objects where bucket_id='product-images' and name=image_path) then raise exception 'Invalid image ownership';end if;
 end loop;
 insert into public.products(id,tenant_id,title,description,price,images,is_active)
 values(p_request,member.tenant_id,trim(p_data->>'title'),coalesce(p_data->>'description',''),(p_data->>'price')::int,array(select jsonb_array_elements_text(p_data->'images')),false) returning id into product_id;
 insert into public.product_variants(tenant_id,product_id,stock_qty,is_active) values(member.tenant_id,product_id,0,true) returning id into variant_id;
 if (p_data->>'stock')::int>0 then insert into public.stock_movements(tenant_id,variant_id,delta,reason,staff_id) values(member.tenant_id,variant_id,(p_data->>'stock')::int,'restock',auth.uid());end if;
 insert into public.platform_audit_events(actor_id,tenant_id,action,metadata) values(auth.uid(),member.tenant_id,'staff.product.create',jsonb_build_object('id',product_id));
 return product_id;
end $$;
revoke all on function public.staff_create_product(uuid,uuid,jsonb) from public,anon;
grant execute on function public.staff_create_product(uuid,uuid,jsonb) to authenticated;
