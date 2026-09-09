-- Do not grant anonymous callers access to private role helpers to make a public policy work.
-- Split the public read predicate from authenticated owner/admin predicates instead.
alter policy tenants_public_read on public.tenants to authenticated;
alter policy categories_public_read on public.categories to authenticated;
alter policy products_public_read on public.products to authenticated;
alter policy variants_public_read on public.product_variants to authenticated;
alter policy zones_public_read on public.delivery_zones to authenticated;
alter policy storefront_settings_public_read on public.tenant_storefront_settings to authenticated;
alter policy storefront_campaigns_public_read on public.storefront_campaigns to authenticated;
alter policy categories_owner_write on public.categories to authenticated;
alter policy products_owner_write on public.products to authenticated;
alter policy variants_owner_write on public.product_variants to authenticated;
alter policy zones_owner_write on public.delivery_zones to authenticated;
alter policy settings_owner on public.tenant_settings to authenticated;
create policy tenants_anon_read on public.tenants for select to anon using(catalog_published and (status='active' or (status='trial' and trial_ends_at>now())));
create policy categories_anon_read on public.categories for select to anon using(is_active and public.is_storefront_public(tenant_id));
create policy products_anon_read on public.products for select to anon using(is_active and public.is_storefront_public(tenant_id));
create policy variants_anon_read on public.product_variants for select to anon using(is_active and public.is_storefront_public(tenant_id));
create policy zones_anon_read on public.delivery_zones for select to anon using(is_active and public.is_storefront_public(tenant_id));
create policy storefront_settings_anon_read on public.tenant_storefront_settings for select to anon using(public.is_storefront_public(tenant_id));
create policy storefront_campaigns_anon_read on public.storefront_campaigns for select to anon using(status='published' and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()) and public.is_storefront_public(tenant_id));
