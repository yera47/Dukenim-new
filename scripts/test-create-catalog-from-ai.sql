begin;
do $$ declare shop uuid;actor uuid;generation uuid; begin
 select tenant_id,user_id into shop,actor from public.tenant_users where role='owner' limit 1;
 update public.tenants set status='active',plan='pro',catalog_status='not_started' where id=shop;
 insert into public.ai_studio_generations(tenant_id,requested_by,intent,input_summary,output,model)
 values(shop,actor,'store_design','Synthetic design test','{"templateKey":"gallery","paletteKey":"mono","brandColor":"#000000","heroTitle":"Серик Шоп","heroSubtitle":"Проверенный текст","heroCtaLabel":"Каталог","rationale":"Спокойный стиль"}','fixture') returning id into generation;
 perform set_config('test.shop',shop::text,true);perform set_config('test.generation',generation::text,true);
 perform set_config('request.jwt.claim.sub',actor::text,true);
end $$;
set local role authenticated;
do $$ declare shop uuid:=current_setting('test.shop')::uuid;generation uuid:=current_setting('test.generation')::uuid; begin
 begin
  perform public.create_catalog_from_ai_design(shop,'Серик Шоп',gen_random_uuid());
  raise exception 'Unknown generation accepted';
 exception when raise_exception then if sqlerrm<>'Design unavailable' then raise; end if; end;
 if (select catalog_status from public.tenants where id=shop)<>'not_started' then raise exception 'Failed request changed store'; end if;
 perform public.create_catalog_from_ai_design(shop,'Серик Шоп',generation);
 if not exists(select 1 from public.tenant_storefront_settings where tenant_id=shop and hero_title='Серик Шоп' and hero_subtitle='Проверенный текст' and brand_color='#000000' and template_key='gallery') then raise exception 'Proposal not saved atomically'; end if;
 if (select catalog_status from public.tenants where id=shop)<>'building' then raise exception 'Catalog state not saved'; end if;
 begin
  perform public.create_catalog_from_ai_design(shop,'Replay',generation);
  raise exception 'Replay accepted';
 exception when raise_exception then if sqlerrm<>'Catalog already created' then raise; end if; end;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 begin
  perform public.create_catalog_from_ai_design(shop,'Outside',generation);
  raise exception 'Outsider accepted';
 exception when raise_exception then if sqlerrm<>'Owner required' then raise; end if; end;
end $$;
rollback;
