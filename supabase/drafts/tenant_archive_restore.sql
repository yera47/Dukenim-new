-- LOCAL DRAFT ONLY. Do not apply until the application changes and SQL tests in
-- docs/TENANT_ARCHIVE_RESTORE_PLAN_20261006.md are complete.
--
-- Archiving preserves the tenant, its memberships and all business records. The
-- entitlement status is intentionally left unchanged: billing webhooks own that
-- field, while archived_at is the independent publication/access lifecycle flag.

alter table public.tenants
  add column archived_at timestamptz,
  add column archived_by uuid references auth.users(id) on delete set null,
  add column archive_reason text,
  add column archived_catalog_was_published boolean;

alter table public.tenants
  add constraint tenants_archive_fields_consistent check (
    (archived_at is null and archived_by is null and archive_reason is null and archived_catalog_was_published is null)
    or
    (archived_at is not null and archive_reason is not null and char_length(archive_reason) between 3 and 1000 and archived_catalog_was_published is not null)
  );

create index tenants_archived_at_idx on public.tenants(archived_at)
  where archived_at is not null;

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
      and t.archived_at is null
      and t.catalog_published
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
  for select to authenticated
  using (
    (
      archived_at is null
      and catalog_published
      and (status = 'active' or (status = 'trial' and trial_ends_at is not null and trial_ends_at > now()))
    )
    or id in (select public.user_tenant_ids())
    or public.is_superadmin()
  );

drop policy if exists tenants_anon_read on public.tenants;
create policy tenants_anon_read on public.tenants
  for select to anon
  using (
    archived_at is null
    and catalog_published
    and (status = 'active' or (status = 'trial' and trial_ends_at is not null and trial_ends_at > now()))
  );

create function public.archive_owner_store(
  p_tenant uuid,
  p_actor uuid,
  p_slug text,
  p_reason text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  shop public.tenants;
begin
  if not (
    exists (
      select 1 from public.tenant_users membership
      where membership.tenant_id = p_tenant
        and membership.user_id = p_actor
        and membership.role = 'owner'
    )
    or exists (
      select 1 from public.profiles profile
      where profile.user_id = p_actor and profile.role = 'superadmin'
    )
  ) then
    raise exception 'Owner required' using errcode = '42501';
  end if;

  if char_length(btrim(coalesce(p_reason, ''))) not between 3 and 1000 then
    raise exception 'Archive reason must contain 3 to 1000 characters';
  end if;

  select * into shop from public.tenants where id = p_tenant for update;
  if shop.id is null or shop.slug <> btrim(p_slug) then
    raise exception 'Store confirmation does not match';
  end if;
  if shop.archived_at is not null then
    raise exception 'Store is already archived';
  end if;

  update public.tenants
  set archived_at = now(),
      archived_by = p_actor,
      archive_reason = btrim(p_reason),
      archived_catalog_was_published = catalog_published,
      catalog_published = false
  where id = p_tenant;

  insert into public.platform_audit_events(actor_id, tenant_id, action, reason, metadata)
  values (
    p_actor,
    p_tenant,
    'tenant.owner_archived',
    btrim(p_reason),
    jsonb_build_object('slug', shop.slug, 'name', shop.name)
  );
  return true;
end;
$$;

revoke all on function public.archive_owner_store(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.archive_owner_store(uuid, uuid, text, text) to service_role;

create function public.restore_owner_store(
  p_tenant uuid,
  p_actor uuid,
  p_slug text,
  p_reason text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  shop public.tenants;
begin
  if not (
    exists (
      select 1 from public.tenant_users membership
      where membership.tenant_id = p_tenant
        and membership.user_id = p_actor
        and membership.role = 'owner'
    )
    or exists (
      select 1 from public.profiles profile
      where profile.user_id = p_actor and profile.role = 'superadmin'
    )
  ) then
    raise exception 'Owner required' using errcode = '42501';
  end if;

  if char_length(btrim(coalesce(p_reason, ''))) not between 3 and 1000 then
    raise exception 'Restore reason must contain 3 to 1000 characters';
  end if;

  select * into shop from public.tenants where id = p_tenant for update;
  if shop.id is null or shop.slug <> btrim(p_slug) then
    raise exception 'Store confirmation does not match';
  end if;
  if shop.archived_at is null then
    raise exception 'Store is not archived';
  end if;

  update public.tenants
  set catalog_published = archived_catalog_was_published,
      archived_at = null,
      archived_by = null,
      archive_reason = null,
      archived_catalog_was_published = null
  where id = p_tenant;

  insert into public.platform_audit_events(actor_id, tenant_id, action, reason, metadata)
  values (
    p_actor,
    p_tenant,
    'tenant.owner_restored',
    btrim(p_reason),
    jsonb_build_object('slug', shop.slug, 'name', shop.name, 'archived_at', shop.archived_at)
  );
  return true;
end;
$$;

revoke all on function public.restore_owner_store(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.restore_owner_store(uuid, uuid, text, text) to service_role;
