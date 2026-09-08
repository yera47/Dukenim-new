begin;
do $$ declare actor uuid; shop uuid; begin
 select tu.user_id,tu.tenant_id into actor,shop from public.tenant_users tu where tu.role='owner' and not exists(select 1 from public.change_requests r where r.tenant_id=tu.tenant_id and r.context->>'topic'='domain_connection' and r.status<>'done') limit 1;
 if actor is null then raise exception 'No fixture'; end if;
 perform set_config('request.jwt.claim.sub',actor::text,true);perform set_config('test.shop',shop::text,true);
end $$;
set local role authenticated;
do $$ declare first_id uuid; second_id uuid; begin
 first_id:=public.open_domain_support(current_setting('test.shop')::uuid);
 second_id:=public.open_domain_support(current_setting('test.shop')::uuid);
 if first_id<>second_id then raise exception 'Duplicate domain request'; end if;
 if (select count(*) from public.messages where request_id=first_id)<>1 then raise exception 'Initial message not atomic'; end if;
 perform set_config('test.request',first_id::text,true);
 insert into public.messages(tenant_id,request_id,from_role,text) values(current_setting('test.shop')::uuid,first_id,'owner','Test follow-up');
 begin insert into public.messages(tenant_id,request_id,from_role,text) values(current_setting('test.shop')::uuid,first_id,'superadmin','Forged reply');raise exception 'Spoof allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select user_id::text from public.profiles where role='superadmin' limit 1),true);
set local role authenticated;
insert into public.messages(tenant_id,request_id,from_role,text) values(current_setting('test.shop')::uuid,current_setting('test.request')::uuid,'superadmin','Test support reply');
do $$ begin if (select count(*) from public.messages where request_id=current_setting('test.request')::uuid)<>3 then raise exception 'Thread history incomplete';end if;end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.messages where request_id=current_setting('test.request')::uuid) then raise exception 'Tenant leak';end if;
 begin perform public.open_domain_support(current_setting('test.shop')::uuid);raise exception 'Outsider allowed';exception when raise_exception then if sqlerrm<>'Owner required' then raise;end if;end;
end $$;
rollback;
