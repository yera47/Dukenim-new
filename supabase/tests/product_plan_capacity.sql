begin;
do $$ declare t uuid;begin
 insert into public.tenants(slug,name,phone,plan,status,catalog_published) values ('limit-test-'||gen_random_uuid(),'Capacity test','00000000000','basic','active',false) returning id into t;
 insert into public.products(tenant_id,title,price) select t,'Test '||n,100 from generate_series(1,200)n;
 begin
 insert into public.products(tenant_id,title,price) values(t,'Blocked',100);
 raise exception 'FAIL: basic limit bypassed';
 exception when check_violation then null;end;
 update public.tenants set plan='standard' where id=t;
 insert into public.products(tenant_id,title,price) values(t,'Allowed premium',100);
 update public.tenants set plan='basic' where id=t;
 update public.products set title='Existing remains editable' where tenant_id=t;
 if (select count(*) from public.products where tenant_id=t)<>201 then raise exception 'FAIL: data lost';end if;
end $$;
rollback;
