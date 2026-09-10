begin;
do $$
declare person uuid:=gen_random_uuid(); shop uuid:=gen_random_uuid(); grant_id uuid:=gen_random_uuid(); generation uuid:=gen_random_uuid(); version timestamptz; published boolean;
begin
 insert into auth.users(id,email,email_confirmed_at) values(person,person||'@example.invalid',now());
 insert into public.tenants(id,slug,name,phone,status,plan,catalog_published) values(shop,'design-test-'||shop,'Fixture','00000000000','active','standard',false);
 insert into public.staff_access(id,tenant_id,user_id,title,permissions,active) values(grant_id,shop,person,'Designer','{"orders":"none","catalog":"none","stock":"none","customers":"none","analytics":"none","studio":"read"}',true);
 insert into public.tenant_storefront_settings(tenant_id,template_key,palette_key,hero_cta_label) values(shop,'atelier','mono','Каталог') returning updated_at into version;
 insert into public.ai_studio_generations(id,tenant_id,requested_by,intent,input_summary,output) values(generation,shop,person,'store_design','Fixture','{"templateKey":"gallery","paletteKey":"mono","heroTitle":"Серик Шоп","heroSubtitle":"Новая коллекция","heroCtaLabel":"В каталог","brandColor":"#ee8899","layout":{"typography":"editorial","hero":"centered","density":"airy","columns":2,"corners":"soft","imageRatio":"portrait"}}');
 perform set_config('request.jwt.claim.sub',person::text,true);
 begin perform public.staff_apply_design(grant_id,generation,version);raise exception 'TEST FAILED: read applied';exception when insufficient_privilege then null;end;
 update public.staff_access set permissions=jsonb_set(permissions,'{studio}','"write"') where id=grant_id;
 perform public.staff_apply_design(grant_id,generation,version);
 if (select hero_title from public.tenant_storefront_settings where tenant_id=shop)<>'Серик Шоп' then raise exception 'TEST FAILED: not saved';end if;
 if (select layout_config->>'hero' from public.tenant_storefront_settings where tenant_id=shop) is distinct from 'centered' then raise exception 'TEST FAILED: layout lost';end if;
 if not exists(select 1 from public.storefront_design_history where tenant_id=shop) then raise exception 'TEST FAILED: no history';end if;
 select catalog_published into published from public.tenants where id=shop;
 if published then raise exception 'TEST FAILED: store opened';end if;
 begin perform public.staff_apply_design(grant_id,generation,version);raise exception 'TEST FAILED: stale overwrite';exception when serialization_failure then null;end;
 select updated_at into version from public.tenant_storefront_settings where tenant_id=shop;
 update public.staff_access set active=false where id=grant_id;
 begin perform public.staff_apply_design(grant_id,generation,version);raise exception 'TEST FAILED: revoked applied';exception when insufficient_privilege then null;end;
 if has_function_privilege('anon','public.staff_apply_design(uuid,uuid,timestamptz)','EXECUTE') then raise exception 'TEST FAILED: anonymous grant';end if;
end $$;
rollback;
