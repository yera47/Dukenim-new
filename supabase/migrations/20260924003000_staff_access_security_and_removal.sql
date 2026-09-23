-- Harden the owner-managed staff invitation lifecycle without broad tenant roles.
alter table public.staff_invitations
  add column if not exists accepted_by uuid references auth.users(id) on delete set null;

alter table public.staff_invitations
  alter column expires_at set default now() + interval '48 hours';

create index if not exists staff_access_user_id_idx on public.staff_access(user_id);
create index if not exists staff_invitations_tenant_created_idx on public.staff_invitations(tenant_id, created_at desc);
create index if not exists staff_invitations_created_by_idx on public.staff_invitations(created_by);

update public.staff_invitations invitation
set accepted_by = member.user_id
from public.staff_access member
join auth.users account on account.id = member.user_id
where invitation.accepted_at is not null
  and invitation.accepted_by is null
  and invitation.tenant_id = member.tenant_id
  and lower(account.email) = lower(invitation.email);

grant select(accepted_by) on public.staff_invitations to authenticated;

create or replace function public.manage_staff(p_tenant uuid, p_action text, p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_id uuid;
  existing public.staff_access;
  normalized_email text;
  v_permissions jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.tenant_users
    where tenant_id = p_tenant and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Owner access required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_data) is distinct from 'object' then
    raise exception 'Invalid request';
  end if;

  if p_action in ('invite', 'update') then
    v_permissions := p_data->'permissions';
    if jsonb_typeof(v_permissions) is distinct from 'object'
      or not (v_permissions ?& array['orders','catalog','stock','customers','analytics','studio'])
      or v_permissions - array['orders','catalog','stock','customers','analytics','studio'] <> '{}'::jsonb
      or exists (
        select 1 from jsonb_each_text(v_permissions) item
        where item.value not in ('none','read','write')
          or (item.key = 'analytics' and item.value = 'write')
      )
      or length(trim(coalesce(p_data->>'title', ''))) not between 1 and 80
    then
      raise exception 'Invalid staff permissions';
    end if;
  end if;

  if p_action = 'invite' then
    normalized_email := lower(trim(coalesce(p_data->>'email', '')));
    if length(normalized_email) not between 3 and 254
      or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      or coalesce(p_data->>'token_hash', '') !~ '^[a-f0-9]{64}$'
    then
      raise exception 'Invalid invitation';
    end if;
    if (
      select count(*) from public.staff_invitations
      where tenant_id = p_tenant and created_by = auth.uid() and created_at >= now() - interval '1 hour'
    ) >= 30 then
      raise exception 'Invitation rate limit reached' using errcode = '54000';
    end if;
    if exists (
      select 1 from auth.users account
      join public.tenant_users owner_membership on owner_membership.user_id = account.id
      where owner_membership.tenant_id = p_tenant and owner_membership.role = 'owner'
        and lower(account.email) = normalized_email
    ) then
      raise exception 'Owner already has access' using errcode = '23505';
    end if;
    if exists (
      select 1 from auth.users account
      join public.staff_access member on member.user_id = account.id
      where member.tenant_id = p_tenant and lower(account.email) = normalized_email
    ) then
      raise exception 'Staff member already exists' using errcode = '23505';
    end if;
    update public.staff_invitations
    set revoked_at = now()
    where tenant_id = p_tenant and email = normalized_email
      and accepted_at is null and revoked_at is null and expires_at > now();
    insert into public.staff_invitations(tenant_id,email,title,permissions,token_hash,expires_at,created_by)
    values(p_tenant,normalized_email,trim(p_data->>'title'),v_permissions,p_data->>'token_hash',now()+interval '48 hours',auth.uid())
    returning id into result_id;
  elsif p_action = 'revoke_invite' then
    update public.staff_invitations set revoked_at = now()
    where id = (p_data->>'id')::uuid and tenant_id = p_tenant
      and accepted_at is null and revoked_at is null
    returning id into result_id;
  elsif p_action = 'update' then
    select * into existing from public.staff_access
    where id = (p_data->>'id')::uuid and tenant_id = p_tenant for update;
    if existing.id is null or existing.revision is distinct from (p_data->>'revision')::integer then
      raise exception 'Access changed; reload';
    end if;
    update public.staff_access
    set title = trim(p_data->>'title'),
        permissions = v_permissions,
        active = (p_data->>'active')::boolean,
        notify_orders = (p_data->>'active')::boolean
          and v_permissions->>'orders' in ('read','write')
          and (p_data->>'notify_orders')::boolean,
        revision = revision + 1
    where id = existing.id
    returning id into result_id;
  elsif p_action = 'remove' then
    select * into existing from public.staff_access
    where id = (p_data->>'id')::uuid and tenant_id = p_tenant for update;
    if existing.id is null then raise exception 'Staff member unavailable'; end if;
    delete from public.staff_access where id = existing.id returning id into result_id;
  else
    raise exception 'Unknown operation';
  end if;

  if result_id is null then raise exception 'Record unavailable'; end if;
  insert into public.platform_audit_events(actor_id,tenant_id,action,metadata)
  values(auth.uid(),p_tenant,'staff.'||p_action,jsonb_build_object('id',result_id));
  return result_id;
end
$$;

revoke all on function public.manage_staff(uuid,text,jsonb) from public,anon;
grant execute on function public.manage_staff(uuid,text,jsonb) to authenticated;

create or replace function public.accept_staff_invitation(p_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.staff_invitations;
  verified_email text;
  result_id uuid;
begin
  if auth.uid() is null or p_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invitation unavailable' using errcode = '42501';
  end if;
  select lower(email) into verified_email from auth.users
  where id = auth.uid() and email_confirmed_at is not null;
  select * into invitation from public.staff_invitations
  where token_hash = p_hash for update;
  if invitation.id is null or invitation.revoked_at is not null
    or invitation.accepted_at is not null or invitation.expires_at <= now()
    or verified_email is null or verified_email <> invitation.email
  then
    raise exception 'Invitation unavailable' using errcode = '42501';
  end if;
  insert into public.staff_access(tenant_id,user_id,title,permissions)
  values(invitation.tenant_id,auth.uid(),invitation.title,invitation.permissions)
  returning id into result_id;
  update public.staff_invitations
  set accepted_at = now(), accepted_by = auth.uid()
  where id = invitation.id;
  insert into public.platform_audit_events(actor_id,tenant_id,action,metadata)
  values(auth.uid(),invitation.tenant_id,'staff.accept',jsonb_build_object('id',result_id));
  return result_id;
end
$$;

revoke all on function public.accept_staff_invitation(text) from public,anon;
grant execute on function public.accept_staff_invitation(text) to authenticated;
