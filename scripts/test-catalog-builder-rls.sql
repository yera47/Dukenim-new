-- Run with the SQL maintenance connection. All test writes are rolled back.
-- Uses an existing owner ONLY as an RLS test identity; no auth session is created.
begin;
select set_config('request.jwt.claim.sub', (select user_id::text from public.tenant_users where role='owner' limit 1), true);
select set_config('dukenim.test_tenant', (select tenant_id::text from public.tenant_users where role='owner' and user_id=auth.uid() limit 1), true);
set local role authenticated;
insert into public.catalog_builder_drafts(tenant_id,state)
values(current_setting('dukenim.test_tenant')::uuid,'{"step":1,"catalogName":"Серик Шоп","templateKey":"atelier","paletteKey":"mono","brief":"Test"}')
on conflict (tenant_id) do update set revision=1,state=excluded.state;
update public.catalog_builder_drafts set revision=2 where tenant_id=current_setting('dukenim.test_tenant')::uuid and revision=1;
do $$ begin
  if (select revision from public.catalog_builder_drafts where tenant_id=current_setting('dukenim.test_tenant')::uuid) is distinct from 2 then raise exception 'Saved draft missing'; end if;
  update public.catalog_builder_drafts set revision=3 where tenant_id=current_setting('dukenim.test_tenant')::uuid and revision=1;
  if found then raise exception 'Stale revision accepted'; end if;
end $$;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
do $$ begin
  if exists(select 1 from public.catalog_builder_drafts) then raise exception 'Tenant isolation failed'; end if;
  update public.catalog_builder_drafts set revision=5 where tenant_id=current_setting('dukenim.test_tenant')::uuid;
  if found then raise exception 'Unauthorized update accepted'; end if;
end $$;
rollback;
