-- Correct a store variant through the stock ledger, never by writing stock_qty.
create function public.root_correct_stock(
  p_tenant uuid,
  p_variant uuid,
  p_actor uuid,
  p_expected integer,
  p_target integer,
  p_reason text
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  item public.product_variants;
begin
  if not exists(select 1 from public.profiles where user_id=p_actor and role='superadmin') then
    raise exception 'Superadmin required' using errcode='42501';
  end if;
  if char_length(btrim(p_reason)) not between 3 and 1000 then raise exception 'Reason required'; end if;
  if p_target is null or p_target not between 0 and 1000000 then raise exception 'Invalid stock target'; end if;
  select * into item from public.product_variants where id=p_variant and tenant_id=p_tenant for update;
  if item.id is null then raise exception 'Variant not found in store'; end if;
  if item.stock_qty is distinct from p_expected then raise exception 'Stock changed; reload'; end if;
  if item.stock_qty=p_target then raise exception 'Stock already matches target'; end if;
  insert into public.stock_movements(tenant_id,variant_id,delta,reason,staff_id)
  values(p_tenant,p_variant,p_target-item.stock_qty,'correction',p_actor);
  insert into public.platform_audit_events(actor_id,tenant_id,action,reason,metadata)
  values(p_actor,p_tenant,'stock.root_corrected',btrim(p_reason),
    jsonb_build_object('variant_id',p_variant,'before',item.stock_qty,'after',p_target));
  return true;
end $$;

revoke all on function public.root_correct_stock(uuid,uuid,uuid,integer,integer,text) from public,anon,authenticated;
grant execute on function public.root_correct_stock(uuid,uuid,uuid,integer,integer,text) to service_role;
