create or replace function public.set_variant_stock(p_tenant_id uuid,p_variant_id uuid,p_target integer) returns integer
language plpgsql security invoker set search_path='' as $$
declare current_stock integer; change integer;
begin
 if auth.uid() is null or (not exists(select 1 from public.tenant_users where tenant_id=p_tenant_id and user_id=auth.uid() and role='owner') and not public.is_superadmin()) then raise exception 'Owner required'; end if;
 if p_target is null or p_target<0 or p_target>1000000 then raise exception 'Invalid stock target'; end if;
 select stock_qty into current_stock from public.product_variants where id=p_variant_id and tenant_id=p_tenant_id for update;
 if not found then raise exception 'Variant not found'; end if;
 change=p_target-current_stock;
 if change<>0 then insert into public.stock_movements(tenant_id,variant_id,delta,reason,staff_id) values(p_tenant_id,p_variant_id,change,'correction',auth.uid()); end if;
 return p_target;
end $$;
