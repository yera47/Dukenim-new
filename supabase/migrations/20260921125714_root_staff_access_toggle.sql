-- A platform administrator may revoke or restore restricted staff access.
-- Store ownership is never changed by this function.
create or replace function public.root_set_staff_access(
  p_access uuid,
  p_actor uuid,
  p_email text,
  p_active boolean,
  p_expected_revision integer,
  p_reason text
) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  membership public.staff_access;
  actual_email text;
begin
  if not exists(select 1 from public.profiles where user_id = p_actor and role = 'superadmin') then
    raise exception 'Superadmin required' using errcode = '42501';
  end if;
  if char_length(btrim(p_reason)) not between 3 and 1000 then
    raise exception 'Reason required';
  end if;
  select * into membership from public.staff_access where id = p_access for update;
  if membership.id is null or membership.revision is distinct from p_expected_revision then
    raise exception 'Access changed; reload';
  end if;
  select lower(email) into actual_email from auth.users where id = membership.user_id;
  if actual_email is null or actual_email <> lower(btrim(p_email)) then
    raise exception 'Email confirmation mismatch';
  end if;
  if exists(select 1 from public.tenant_users where tenant_id = membership.tenant_id and user_id = membership.user_id) then
    raise exception 'This user also has store owner access';
  end if;
  if membership.active = p_active then
    raise exception 'Access already has this status';
  end if;
  update public.staff_access
     set active = p_active, revision = revision + 1
   where id = membership.id;
  insert into public.platform_audit_events(actor_id, tenant_id, action, reason, metadata)
  values(p_actor, membership.tenant_id,
    case when p_active then 'staff.root_restored' else 'staff.root_revoked' end,
    btrim(p_reason), jsonb_build_object('access_id', membership.id, 'user_id', membership.user_id, 'before', membership.active, 'after', p_active));
  return true;
end $$;

revoke all on function public.root_set_staff_access(uuid,uuid,text,boolean,integer,text) from public, anon, authenticated;
grant execute on function public.root_set_staff_access(uuid,uuid,text,boolean,integer,text) to service_role;
