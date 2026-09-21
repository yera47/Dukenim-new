-- Root may close a storefront immediately, or publish it only after the same
-- readiness checks used by the merchant publish flow.
create function public.root_set_catalog_publication(
  p_tenant uuid,
  p_actor uuid,
  p_slug text,
  p_expected boolean,
  p_publish boolean,
  p_reason text
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  shop public.tenants;
  settings public.tenant_settings;
begin
  if not exists(select 1 from public.profiles where user_id = p_actor and role = 'superadmin') then
    raise exception 'Superadmin required' using errcode = '42501';
  end if;
  if char_length(btrim(p_reason)) not between 3 and 1000 then raise exception 'Reason required'; end if;
  select * into shop from public.tenants where id = p_tenant for update;
  if shop.id is null or shop.slug <> btrim(p_slug) then raise exception 'Store confirmation mismatch'; end if;
  if shop.catalog_published is distinct from p_expected or shop.catalog_published = p_publish then
    raise exception 'Publication changed; reload';
  end if;
  if p_publish then
    if (shop.status = 'active' or (shop.status = 'trial' and shop.trial_ends_at > now())) is not true then
      raise exception 'Store inactive';
    end if;
    if not exists(select 1 from public.products p join public.product_variants v on v.product_id=p.id and v.tenant_id=p.tenant_id where p.tenant_id=p_tenant and p.is_active and v.is_active and v.stock_qty>0) then
      raise exception 'Add an available product';
    end if;
    select * into settings from public.tenant_settings where tenant_id=p_tenant;
    if not found or not (settings.delivery_enabled or settings.pickup_enabled or exists(select 1 from public.reservation_settings rs where rs.tenant_id=p_tenant and rs.enabled)) then
      raise exception 'Receiving method required';
    end if;
    if settings.delivery_enabled and not exists(select 1 from public.delivery_zones where tenant_id=p_tenant and is_active) then
      raise exception 'Delivery zone required';
    end if;
    if settings.pickup_enabled and length(coalesce(settings.pickup_location->>'address',''))<5 then
      raise exception 'Pickup address required';
    end if;
  end if;
  update public.tenants set catalog_published=p_publish,
    catalog_status=case when p_publish then 'ready' else catalog_status end
    where id=p_tenant;
  insert into public.platform_audit_events(actor_id,tenant_id,action,reason,metadata)
  values(p_actor,p_tenant,case when p_publish then 'catalog.root_published' else 'catalog.root_unpublished' end,
    btrim(p_reason),jsonb_build_object('slug',shop.slug,'before',shop.catalog_published,'after',p_publish));
  return true;
end $$;

revoke all on function public.root_set_catalog_publication(uuid,uuid,text,boolean,boolean,text) from public,anon,authenticated;
grant execute on function public.root_set_catalog_publication(uuid,uuid,text,boolean,boolean,text) to service_role;
