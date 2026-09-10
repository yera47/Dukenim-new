create function public.root_delete_empty_store(p_tenant uuid,p_actor uuid,p_slug text,p_reason text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare shop public.tenants;
begin
 if not exists(select 1 from public.profiles where user_id=p_actor and role::text='superadmin') then raise exception 'Access denied' using errcode='42501';end if;
 if length(trim(p_reason)) not between 3 and 1000 then raise exception 'Укажите причину удаления';end if;
 select * into shop from public.tenants where id=p_tenant for update;
 if shop.id is null or shop.slug<>p_slug then raise exception 'Подтверждение адреса магазина не совпало';end if;
 if exists(select 1 from public.products where tenant_id=p_tenant)
 or exists(select 1 from public.orders where tenant_id=p_tenant)
 or exists(select 1 from public.customers where tenant_id=p_tenant)
 or exists(select 1 from public.subscriptions where tenant_id=p_tenant)
 or exists(select 1 from public.subscription_checkout_requests where tenant_id=p_tenant)
 or exists(select 1 from public.ai_credit_purchases where tenant_id=p_tenant)
 then raise exception 'Магазин содержит товары, клиентов или финансовую историю. Приостановите его вместо удаления.';end if;
 insert into public.platform_audit_events(actor_id,tenant_id,action,reason,metadata)
 values(p_actor,null,'tenant.empty_deleted',trim(p_reason),jsonb_build_object('deleted_tenant_id',p_tenant,'slug',shop.slug,'name',shop.name));
 delete from public.tenants where id=p_tenant;
 return true;
end $$;
revoke all on function public.root_delete_empty_store(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.root_delete_empty_store(uuid,uuid,text,text) to service_role;
