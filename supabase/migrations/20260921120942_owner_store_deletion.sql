-- Only the service-role server action can request deletion; the database checks
-- the authenticated owner again and refuses stores with operational history.
create function public.delete_owner_store(p_tenant uuid, p_actor uuid, p_slug text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare shop public.tenants;
begin
  if not exists (
    select 1 from public.tenant_users u
    where u.tenant_id = p_tenant and u.user_id = p_actor and u.role = 'owner'
  ) then raise exception 'Удалять магазин может только его владелец' using errcode = '42501'; end if;

  select * into shop from public.tenants where id = p_tenant for update;
  if shop.id is null or shop.slug <> btrim(p_slug) then
    raise exception 'Адрес магазина для подтверждения не совпал';
  end if;

  if exists(select 1 from public.orders where tenant_id = p_tenant)
    or exists(select 1 from public.customers where tenant_id = p_tenant)
    or exists(select 1 from public.subscriptions where tenant_id = p_tenant)
    or exists(select 1 from public.subscription_checkout_requests where tenant_id = p_tenant)
    or exists(select 1 from public.ai_credit_purchases where tenant_id = p_tenant)
    or exists(select 1 from public.crm_setup_charges where tenant_id = p_tenant)
    or exists(select 1 from public.buyer_members where tenant_id = p_tenant)
    or exists(select 1 from public.buyer_order_access where tenant_id = p_tenant)
    or exists(select 1 from public.buyer_referrals where tenant_id = p_tenant)
    or exists(select 1 from public.integration_connections where tenant_id = p_tenant)
    or exists(select 1 from public.sms_campaigns where tenant_id = p_tenant)
    or exists(select 1 from public.sms_outbox where tenant_id = p_tenant)
    or exists(select 1 from public.staff_access where tenant_id = p_tenant and active)
  then raise exception 'Есть заказы, клиенты, платежи или активные подключения. Удаление недоступно.'; end if;

  insert into public.platform_audit_events(actor_id, tenant_id, action, reason, metadata)
  values (p_actor, null, 'tenant.owner_deleted', 'Владелец удалил магазин',
    jsonb_build_object('deleted_tenant_id', p_tenant, 'slug', shop.slug, 'name', shop.name));
  delete from public.tenants where id = p_tenant;
  return true;
end $$;

revoke all on function public.delete_owner_store(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.delete_owner_store(uuid, uuid, text) to service_role;
