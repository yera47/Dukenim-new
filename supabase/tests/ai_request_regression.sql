-- All fixtures and requests roll back. Run with the migration inside the same transaction before applying.
begin;
do $$
declare own uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid(); shop uuid:=gen_random_uuid(); other_shop uuid:=gen_random_uuid(); gen uuid:=gen_random_uuid();
begin
 insert into auth.users(id,email) values(own,own||'@example.invalid'),(other_user,other_user||'@example.invalid');
 insert into public.tenants(id,slug,name,phone,status,plan,catalog_published) values(shop,'ai-request-'||shop,'Rollback request fixture','00000000000','active','standard',false),(other_shop,'ai-other-'||other_shop,'Rollback other fixture','00000000000','active','standard',false);
 insert into public.tenant_users(tenant_id,user_id,role) values(shop,own,'owner'),(other_shop,other_user,'owner');
 insert into public.ai_studio_generations(id,tenant_id,requested_by,intent,input_summary,output) values(gen,shop,own,'consultation','Help request','{"reply":"Help","help":"payments","task":null}');
 perform set_config('request.jwt.claim.sub',own::text,true);
 perform set_config('test.shop',shop::text,true); perform set_config('test.other_shop',other_shop::text,true);
 perform set_config('test.gen',gen::text,true); perform set_config('test.other_user',other_user::text,true);
end $$;
set local role authenticated;
do $$
declare shop uuid:=current_setting('test.shop')::uuid; gen uuid:=current_setting('test.gen')::uuid; rid uuid; again uuid; ctx jsonb;
begin
 ctx:=jsonb_build_object('ai_generation_id',gen,'ai_intent','payments','page_path','/admin/ai-studio');
 rid:=public.create_support_request(shop,'Проверка оплаты','Подключение оплаты картой','ai-studio',ctx);
 again:=public.create_support_request(shop,'Повтор после потери ответа','Подключение оплаты картой','ai-studio',ctx);
 if rid<>again then raise exception 'Replay duplicated request'; end if;
 if (select count(*) from public.messages where request_id=rid)<>1 then raise exception 'Missing or duplicate thread message'; end if;
 if not exists(select 1 from public.change_requests where id=rid and text='Проверка оплаты' and status='new') then raise exception 'Original request changed'; end if;
 begin
  perform public.create_support_request(shop,'Invalid kind','Invalid request','ai-studio',ctx||'{"ai_intent":"kaspi"}');
  raise exception 'TEST FAILED mismatched intent accepted';
 exception when raise_exception then if sqlerrm like 'TEST FAILED%' then raise; end if; end;
 perform set_config('request.jwt.claim.sub',current_setting('test.other_user'),true);
 if exists(select 1 from public.change_requests where id=rid) then raise exception 'Cross-tenant read'; end if;
 begin
  perform public.create_support_request(shop,'Outsider test','Invalid request','ai-studio',ctx);
  raise exception 'TEST FAILED outsider accepted';
 exception when raise_exception then if sqlerrm like 'TEST FAILED%' then raise; end if; end;
 begin
  perform public.create_support_request(current_setting('test.other_shop')::uuid,'Foreign generation','Invalid request','ai-studio',ctx);
  raise exception 'TEST FAILED foreign generation accepted';
 exception when raise_exception then if sqlerrm like 'TEST FAILED%' then raise; end if; end;
end $$;
reset role;
rollback;

