-- A trial storefront is public only during its exact seven-day window. Paid stores remain
-- public while active; owners and the root administrator retain management visibility.
create or replace function public.is_storefront_public(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenants t
    where t.id = p_tenant_id
      and (
        t.status = 'active'
        or (t.status = 'trial' and t.trial_ends_at is not null and t.trial_ends_at > now())
      )
  );
$$;

revoke all on function public.is_storefront_public(uuid) from public;
grant execute on function public.is_storefront_public(uuid) to anon, authenticated, service_role;

drop policy if exists tenants_public_read on public.tenants;
create policy tenants_public_read on public.tenants
  for select
  using (
    status = 'active'
    or (status = 'trial' and trial_ends_at is not null and trial_ends_at > now())
    or id in (select public.user_tenant_ids())
    or public.is_superadmin()
  );

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
  for select
  using ((is_active and public.is_storefront_public(tenant_id)) or tenant_id in (select public.user_tenant_ids()) or public.is_superadmin());

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select
  using ((is_active and public.is_storefront_public(tenant_id)) or tenant_id in (select public.user_tenant_ids()) or public.is_superadmin());

drop policy if exists variants_public_read on public.product_variants;
create policy variants_public_read on public.product_variants
  for select
  using ((is_active and public.is_storefront_public(tenant_id)) or tenant_id in (select public.user_tenant_ids()) or public.is_superadmin());

drop policy if exists zones_public_read on public.delivery_zones;
create policy zones_public_read on public.delivery_zones
  for select
  using ((is_active and public.is_storefront_public(tenant_id)) or tenant_id in (select public.user_tenant_ids()) or public.is_superadmin());

drop policy if exists storefront_settings_public_read on public.tenant_storefront_settings;
create policy storefront_settings_public_read on public.tenant_storefront_settings
  for select
  using (public.is_storefront_public(tenant_id) or tenant_id in (select public.user_tenant_ids()) or public.is_superadmin());

drop policy if exists storefront_campaigns_public_read on public.storefront_campaigns;
create policy storefront_campaigns_public_read on public.storefront_campaigns
  for select
  using (
    status = 'published'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
    and public.is_storefront_public(tenant_id)
    or tenant_id in (select public.user_tenant_ids())
    or public.is_superadmin()
  );
