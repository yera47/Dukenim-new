-- Existing support requests are unaffected; AI cards use the persisted generation ID.
create unique index change_requests_ai_generation_unique
  on public.change_requests(tenant_id, (context->>'ai_generation_id'))
  where source='ai-studio' and context ? 'ai_generation_id';
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

  -- One support thread per saved AI answer, including retries after lost responses.
  if p_source = 'ai-studio' and p_context ? 'ai_generation_id' then
    if auth.uid() is null or not exists (
      select 1 from public.tenant_users where tenant_id=p_tenant_id and user_id=auth.uid() and role='owner'
    ) then raise exception 'Owner required'; end if;
    if not exists (
      select 1 from public.ai_studio_generations
      where id = (p_context->>'ai_generation_id')::uuid and tenant_id=p_tenant_id
        and intent='consultation' and output->>'help'=p_context->>'ai_intent'
        and output->>'help' in ('payments','kaspi','integrations','support')
    ) then raise exception 'Saved AI answer unavailable'; end if;
    perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || ':ai-request:' || (p_context->>'ai_generation_id'),0));
    select id into v_request_id from public.change_requests
      where tenant_id=p_tenant_id and source='ai-studio'
        and context->>'ai_generation_id'=p_context->>'ai_generation_id';
    if v_request_id is not null then return v_request_id; end if;
  end if;
  insert into public.change_requests (tenant_id, text, subject, source, context, status)
  values (p_tenant_id, v_text, v_subject, p_source, coalesce(p_context, '{}'::jsonb), 'new')
  returning id into v_request_id;

  insert into public.messages (tenant_id, from_role, text, request_id)
  values (p_tenant_id, 'owner', v_text, v_request_id);

  return v_request_id;
end;
$$;

revoke all on function public.create_support_request(uuid, text, text, text, jsonb) from public;
revoke all on function public.create_support_request(uuid, text, text, text, jsonb) from anon;
grant execute on function public.create_support_request(uuid, text, text, text, jsonb) to authenticated;



