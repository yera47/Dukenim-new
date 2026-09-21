alter table public.messages add column read_at timestamptz;

create or replace function public.mark_support_thread_read(p_request uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare req public.change_requests%rowtype; recipient public.message_from_role; updated_count integer;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into req from public.change_requests where id=p_request;
  if not found then raise exception 'Thread unavailable'; end if;
  if public.is_superadmin() then recipient='owner';
  elsif exists(select 1 from public.tenant_users u where u.tenant_id=req.tenant_id and u.user_id=auth.uid() and u.role='owner') then recipient='superadmin';
  else raise exception 'Thread unavailable'; end if;
  update public.messages set read_at=now() where request_id=p_request and tenant_id=req.tenant_id and from_role=recipient and read_at is null;
  get diagnostics updated_count=row_count;
  return updated_count;
end $$;
revoke all on function public.mark_support_thread_read(uuid) from public,anon,authenticated;
grant execute on function public.mark_support_thread_read(uuid) to authenticated;

alter publication supabase_realtime add table public.messages;
