begin;
do $$ declare t uuid;a uuid;s text;begin
 select user_id into a from public.profiles where role::text='superadmin' limit 1;
 if a is null then raise exception 'No root fixture';end if;
 s:='delete-test-'||gen_random_uuid();
 insert into public.tenants(slug,name,phone,catalog_published) values(s,'Empty test','00000000000',false) returning id into t;
 begin perform public.root_delete_empty_store(t,gen_random_uuid(),s,'test');raise exception 'Permission bypass';exception when insufficient_privilege then null;end;
 insert into public.products(tenant_id,title,price) values(t,'Protected',100);
 begin perform public.root_delete_empty_store(t,a,s,'test');raise exception 'Product loss';exception when raise_exception then if SQLERRM='Product loss' then raise;end if;end;
 delete from public.products where tenant_id=t;
 perform public.root_delete_empty_store(t,a,s,'rollback fixture');
 if exists(select 1 from public.tenants where id=t) then raise exception 'Not deleted';end if;
end $$;
rollback;
