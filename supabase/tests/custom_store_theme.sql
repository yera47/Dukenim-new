begin;
insert into auth.users(id) values ('ca090909-0000-4000-8000-000000000001');
insert into public.tenants(id,slug,name,phone,status,plan,catalog_status)
values ('ca090909-0000-4000-8000-000000000002','theme-test-rollback','Theme test','00000000000','active','basic','not_started');
insert into public.tenant_users(tenant_id,user_id,role) values ('ca090909-0000-4000-8000-000000000002','ca090909-0000-4000-8000-000000000001','owner');
insert into public.ai_studio_generations(id,tenant_id,requested_by,intent,input_summary,output) values ('ca090909-0000-4000-8000-000000000008','ca090909-0000-4000-8000-000000000002','ca090909-0000-4000-8000-000000000001','store_design','Test','{"templateKey":"atelier","paletteKey":"mono","heroTitle":"Серик Шоп","heroSubtitle":"Уход каждый день","heroCtaLabel":"Каталог","sections":[{"name":"Уход"},{"name":"Наборы"}]}'::jsonb);
set local role authenticated;
set local request.jwt.claim.sub='ca090909-0000-4000-8000-000000000001';
do $$ begin
 begin
  perform public.create_catalog_with_theme('ca090909-0000-4000-8000-000000000002','Test','atelier','mono',null,'{"background":"url(evil)","surface":"#ffffff","accent":"#164a36"}'::jsonb);
  raise exception 'Invalid theme accepted';
 exception when check_violation then null; end;
 if (select catalog_status from public.tenants where id='ca090909-0000-4000-8000-000000000002')<>'not_started' then raise exception 'Non atomic failure';end if;
end $$;
select public.create_catalog_with_theme('ca090909-0000-4000-8000-000000000002','Test','market','mono','ca090909-0000-4000-8000-000000000008','{"background":"#f7dce6","surface":"#fff3f7","accent":"#164a36"}'::jsonb);
update public.tenant_storefront_settings set color_theme='{"background":"#ffffff","surface":"#fafafa","accent":"#221144"}'::jsonb where tenant_id='ca090909-0000-4000-8000-000000000002';
select public.undo_storefront_design('ca090909-0000-4000-8000-000000000002',(select id from public.storefront_design_history where tenant_id='ca090909-0000-4000-8000-000000000002' order by created_at desc,id desc limit 1));
do $$ begin
 if (select count(*) from public.categories where tenant_id='ca090909-0000-4000-8000-000000000002')<>2 then raise exception 'AI categories missing';end if;
 if (select template_key from public.tenant_storefront_settings where tenant_id='ca090909-0000-4000-8000-000000000002')<>'market' then raise exception 'Owner composition lost';end if;
 if (select color_theme->>'background' from public.tenant_storefront_settings where tenant_id='ca090909-0000-4000-8000-000000000002') is distinct from '#f7dce6' then raise exception 'Undo did not restore colors'; end if;
 if has_function_privilege('anon','public.create_catalog_with_theme(uuid,text,text,text,uuid,jsonb)','execute') then raise exception 'Anonymous create allowed';end if;
end $$;
set local request.jwt.claim.sub='ca090909-0000-4000-8000-000000000003';
do $$ declare n int; begin
 update public.tenant_storefront_settings set color_theme=null where tenant_id='ca090909-0000-4000-8000-000000000002';
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Cross-tenant update allowed';end if;
end $$;
reset role;
rollback;
