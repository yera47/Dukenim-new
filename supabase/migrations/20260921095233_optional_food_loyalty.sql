create or replace function public.create_catalog_setup_with_loyalty(p_tenant_id uuid,p_name text,p_template text,p_palette text,p_generation_id uuid,p_color_theme jsonb,p_fulfilment jsonb,p_payment_preference text,p_loyalty jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
 if p_loyalty is not null and (p_loyalty->>'enabled')::boolean is true then
  if not exists(select 1 from public.tenants where id=p_tenant_id and business_vertical='food') then raise exception 'Loyalty is available for food stores only'; end if;
  perform public.save_loyalty_program(p_tenant_id,p_loyalty);
 end if;
 result=public.create_catalog_setup(p_tenant_id,p_name,p_template,p_palette,p_generation_id,p_color_theme,p_fulfilment,p_payment_preference);
 return result;
end $$;

create function public.set_variant_stock(p_tenant_id uuid,p_variant_id uuid,p_target integer) returns integer
language plpgsql security invoker set search_path='' as $$
declare current_stock integer; change integer;
begin
 if p_target is null or p_target<0 or p_target>1000000 then raise exception 'Invalid stock target'; end if;
 select stock_qty into current_stock from public.product_variants where id=p_variant_id and tenant_id=p_tenant_id for update;
 if not found then raise exception 'Variant not found'; end if;
 change=p_target-current_stock;
 if change<>0 then insert into public.stock_movements(tenant_id,variant_id,delta,reason,staff_id) values(p_tenant_id,p_variant_id,change,'correction',auth.uid()); end if;
 return p_target;
end $$;
revoke all on function public.set_variant_stock(uuid,uuid,integer) from public,anon;
grant execute on function public.set_variant_stock(uuid,uuid,integer) to authenticated;
