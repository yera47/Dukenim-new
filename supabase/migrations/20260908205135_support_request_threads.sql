alter table public.change_requests add constraint change_requests_id_tenant_unique unique(id,tenant_id);
alter table public.messages add column request_id uuid;
alter table public.messages add constraint message_request_tenant_fk foreign key(request_id,tenant_id) references public.change_requests(id,tenant_id);
create index messages_request_created_idx on public.messages(request_id,created_at);
drop policy messages_owner on public.messages;
create policy messages_read on public.messages for select to authenticated using(public.is_superadmin() or tenant_id in(select public.user_tenant_ids()));
create policy messages_send on public.messages for insert to authenticated with check(
 (public.is_superadmin() and from_role='superadmin') or
 (from_role='owner' and tenant_id in(select public.user_tenant_ids()))
);
-- Existing unthreaded messages remain in the general conversation.
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

  insert into public.messages (tenant_id, from_role, text, request_id)
  values (p_tenant_id, 'owner', v_text, v_request_id);

  return v_request_id;
end;
$$;

revoke all on function public.create_support_request(uuid, text, text, text, jsonb) from public;
revoke all on function public.create_support_request(uuid, text, text, text, jsonb) from anon;
grant execute on function public.create_support_request(uuid, text, text, text, jsonb) to authenticated;


create function public.open_domain_support(p_tenant_id uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_slug text; v_domain text;
begin
 if auth.uid() is null or not exists(select 1 from public.tenant_users where tenant_id=p_tenant_id and user_id=auth.uid() and role='owner') then raise exception 'Owner required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,0));
 select id into v_id from public.change_requests where tenant_id=p_tenant_id and context->>'topic'='domain_connection' and status<>'done' order by created_at desc limit 1;
 if v_id is not null then return v_id; end if;
 select slug,custom_domain into v_slug,v_domain from public.tenants where id=p_tenant_id;
 if not found then raise exception 'Store unavailable'; end if;
 return public.create_support_request(p_tenant_id,
 'Здравствуйте! Помогите подключить собственный домен к магазину https://www.dukenim.kz/s/'||v_slug||'. '||
 case when v_domain is not null then 'Домен в настройках: '||v_domain||'.' else 'Название домена уточню в этом чате.' end,
 'Подключение своего домена','settings',jsonb_build_object('topic','domain_connection','page_path','/admin/domains','store_slug',v_slug,'domain',v_domain));
end $$;
revoke all on function public.open_domain_support(uuid) from public,anon;
grant execute on function public.open_domain_support(uuid) to authenticated;
