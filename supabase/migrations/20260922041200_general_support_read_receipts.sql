create or replace function public.mark_general_support_read(p_tenant uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare recipient public.message_from_role; updated_count integer;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if public.is_superadmin() then recipient='owner';
  elsif exists(select 1 from public.tenant_users u where u.tenant_id=p_tenant and u.user_id=auth.uid() and u.role='owner') then recipient='superadmin';
  else raise exception 'Chat unavailable'; end if;
  update public.messages set read_at=now()
   where tenant_id=p_tenant and request_id is null and from_role=recipient and read_at is null;
  get diagnostics updated_count=row_count;
  return updated_count;
end $$;
revoke all on function public.mark_general_support_read(uuid) from public,anon,authenticated;
grant execute on function public.mark_general_support_read(uuid) to authenticated;
