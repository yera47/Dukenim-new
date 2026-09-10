-- Restricted team membership never enters tenant_users.
create table public.staff_invitations (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
 email text not null check(length(email) between 3 and 254), title text not null check(length(trim(title)) between 1 and 80),
 permissions jsonb not null, token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null default now()+interval '7 days', accepted_at timestamptz, revoked_at timestamptz,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
alter table public.staff_invitations enable row level security;
revoke all on public.staff_invitations from anon, authenticated;
grant select(id,tenant_id,email,title,permissions,expires_at,accepted_at,revoked_at,created_at) on public.staff_invitations to authenticated;
grant all on public.staff_invitations to service_role;
create policy staff_invite_owner on public.staff_invitations for select to authenticated using (
 exists(select 1 from public.tenant_users where tenant_id=staff_invitations.tenant_id and user_id=(select auth.uid()) and role='owner')
);

create function public.manage_staff(p_tenant uuid,p_action text,p_data jsonb) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare result_id uuid; existing public.staff_access; checked public.staff_access;
begin
 if auth.uid() is null or not exists(select 1 from public.tenant_users where tenant_id=p_tenant and user_id=auth.uid() and role='owner') then
  raise exception 'Owner access required' using errcode='42501';
 end if;
 if p_action='invite' then
  -- Validate the same strict shape used by staff_access before storing an invitation.
  if jsonb_typeof(p_data->'permissions') is distinct from 'object'
   or not (p_data->'permissions' ?& array['orders','catalog','stock','customers','analytics','studio'])
   or (p_data->'permissions')-array['orders','catalog','stock','customers','analytics','studio'] <> '{}'::jsonb
   or exists(select 1 from jsonb_each_text(p_data->'permissions') kv where kv.value is null or kv.value not in ('none','read','write') or (kv.key='analytics' and kv.value='write'))
   then raise exception 'Invalid permissions'; end if;
  insert into public.staff_invitations(tenant_id,email,title,permissions,token_hash,created_by)
  values(p_tenant,lower(trim(p_data->>'email')),trim(p_data->>'title'),p_data->'permissions',p_data->>'token_hash',auth.uid()) returning id into result_id;
 elsif p_action='revoke_invite' then
  update public.staff_invitations set revoked_at=now() where id=(p_data->>'id')::uuid and tenant_id=p_tenant and accepted_at is null returning id into result_id;
 elsif p_action='update' then
  select * into existing from public.staff_access where id=(p_data->>'id')::uuid and tenant_id=p_tenant for update;
  if existing.id is null or existing.revision is distinct from (p_data->>'revision')::int then raise exception 'Access changed; reload'; end if;
  update public.staff_access set title=trim(p_data->>'title'),permissions=p_data->'permissions',active=(p_data->>'active')::boolean,
    notify_orders=(p_data->>'notify_orders')::boolean,revision=revision+1 where id=existing.id returning id into result_id;
 else raise exception 'Unknown operation'; end if;
 if result_id is null then raise exception 'Record unavailable'; end if;
 insert into public.platform_audit_events(actor_id,tenant_id,action,metadata)
 values(auth.uid(),p_tenant,'staff.'||p_action,jsonb_build_object('id',result_id));
 return result_id;
end $$;
revoke all on function public.manage_staff(uuid,text,jsonb) from public,anon;
grant execute on function public.manage_staff(uuid,text,jsonb) to authenticated;

create function public.accept_staff_invitation(p_hash text) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare invitation public.staff_invitations; verified_email text; result_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first' using errcode='42501'; end if;
 select lower(email) into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 select * into invitation from public.staff_invitations where token_hash=p_hash for update;
 if invitation.id is null or invitation.revoked_at is not null or invitation.accepted_at is not null or invitation.expires_at<=now()
 or verified_email is null or verified_email<>invitation.email then raise exception 'Invitation unavailable or email not verified' using errcode='42501'; end if;
 -- Never overwrite existing membership with a stale invitation.
 insert into public.staff_access(tenant_id,user_id,title,permissions) values(invitation.tenant_id,auth.uid(),invitation.title,invitation.permissions) returning id into result_id;
 update public.staff_invitations set accepted_at=now() where id=invitation.id;
 insert into public.platform_audit_events(actor_id,tenant_id,action,metadata) values(auth.uid(),invitation.tenant_id,'staff.accept',jsonb_build_object('id',result_id));
 return result_id;
end $$;
revoke all on function public.accept_staff_invitation(text) from public,anon;
grant execute on function public.accept_staff_invitation(text) to authenticated;

-- Atomic permission check and order update: revocation waits for in-flight writes.
create function public.staff_order_status(p_access uuid,p_order uuid,p_expected public.order_status,p_status public.order_status) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare membership public.staff_access; changed uuid;
begin
 select * into membership from public.staff_access where id=p_access and user_id=auth.uid() and active for share;
 if membership.id is null or membership.permissions->>'orders'<>'write' then raise exception 'Access denied' using errcode='42501'; end if;
 if not ((p_expected='new' and p_status in ('confirmed','cancelled')) or (p_expected='confirmed' and p_status in ('assembled','cancelled'))
 or (p_expected='assembled' and p_status in ('delivering','done','cancelled')) or (p_expected='delivering' and p_status='done')) then raise exception 'Invalid transition'; end if;
 update public.orders set status=p_status,staff_id=auth.uid() where id=p_order and tenant_id=membership.tenant_id and status=p_expected returning id into changed;
 if changed is null then raise exception 'Order changed; reload'; end if;
 insert into public.platform_audit_events(actor_id,tenant_id,action,metadata) values(auth.uid(),membership.tenant_id,'staff.order_status',jsonb_build_object('order_id',p_order,'status',p_status));
 return true;
end $$;
revoke all on function public.staff_order_status(uuid,uuid,public.order_status,public.order_status) from public,anon;
grant execute on function public.staff_order_status(uuid,uuid,public.order_status,public.order_status) to authenticated;

create function public.staff_orders(p_access uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare membership public.staff_access;
begin
 select * into membership from public.staff_access where id=p_access and user_id=auth.uid() and active;
 if membership.id is null or membership.permissions->>'orders' not in ('read','write') then raise exception 'Access denied' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(q)) from (select id,order_number,status,total,delivery_method,created_at from public.orders where tenant_id=membership.tenant_id order by created_at desc limit 100) q),'[]'::jsonb);
end $$;
revoke all on function public.staff_orders(uuid) from public,anon;
grant execute on function public.staff_orders(uuid) to authenticated;
