-- Keep the support queue and its chat copy in sync while preserving tenant RLS.
alter table public.change_requests
  add column if not exists subject text not null default 'Обращение в поддержку',
  add column if not exists source text not null default 'support',
  add column if not exists context jsonb not null default '{}'::jsonb;

alter table public.change_requests drop constraint if exists change_requests_subject_length_check;
alter table public.change_requests add constraint change_requests_subject_length_check
  check (char_length(subject) between 2 and 120);

alter table public.change_requests drop constraint if exists change_requests_source_check;
alter table public.change_requests add constraint change_requests_source_check
  check (source in ('support', 'ai-studio', 'catalog', 'orders', 'settings', 'integrations'));

alter table public.change_requests drop constraint if exists change_requests_context_size_check;
alter table public.change_requests add constraint change_requests_context_size_check
  check (octet_length(context::text) <= 8192);

create index if not exists change_requests_tenant_status_created_idx
  on public.change_requests (tenant_id, status, created_at desc);

create or replace function public.create_support_request(
  p_tenant_id uuid,
  p_text text,
  p_subject text default 'Обращение в поддержку',
  p_source text default 'support',
  p_context jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_text text := trim(coalesce(p_text, ''));
  v_subject text := trim(coalesce(p_subject, ''));
begin
  if p_tenant_id is null or not (
    p_tenant_id in (select public.user_tenant_ids()) or public.is_superadmin()
  ) then
    raise exception 'Forbidden';
  end if;
  if char_length(v_text) < 2 or char_length(v_text) > 3000 then
    raise exception 'Support message must be between 2 and 3000 characters';
  end if;
  if char_length(v_subject) < 2 or char_length(v_subject) > 120 then
    raise exception 'Support subject must be between 2 and 120 characters';
  end if;

  insert into public.change_requests (tenant_id, text, subject, source, context, status)
  values (p_tenant_id, v_text, v_subject, p_source, coalesce(p_context, '{}'::jsonb), 'new')
  returning id into v_request_id;

  insert into public.messages (tenant_id, from_role, text)
  values (p_tenant_id, 'owner', v_text);

  return v_request_id;
end;
$$;

revoke all on function public.create_support_request(uuid, text, text, text, jsonb) from public;
revoke all on function public.create_support_request(uuid, text, text, text, jsonb) from anon;
grant execute on function public.create_support_request(uuid, text, text, text, jsonb) to authenticated;
