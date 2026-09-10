-- Synthetic fixtures, always rolled back; no email, account session or merchant order survives.
begin;
do $$
<<fixture>>
declare owner_id uuid:=gen_random_uuid(); staff_id uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); tenant uuid:=gen_random_uuid();
 invitation uuid; membership uuid; product_id uuid:=gen_random_uuid(); variant_id uuid:=gen_random_uuid(); permissions jsonb:='{"orders":"write","catalog":"none","stock":"none","customers":"none","analytics":"none","studio":"none"}';
begin
 insert into auth.users(id,email,email_confirmed_at) values(owner_id,owner_id||'@example.invalid',now()),(staff_id,staff_id||'@example.invalid',now()),(outsider,outsider||'@example.invalid',now());
 insert into public.tenants(id,slug,name,phone,catalog_published,status,plan) values(tenant,'staff-test-'||tenant,'Rollback fixture','00000000000',false,'active','standard');
 insert into public.tenant_users(tenant_id,user_id,role) values(tenant,owner_id,'owner');
 perform set_config('request.jwt.claim.sub',outsider::text,true);
 begin
  perform public.manage_staff(tenant,'invite',jsonb_build_object('email',staff_id||'@example.invalid','title','Manager','permissions',permissions,'token_hash',repeat('a',64)));
  raise exception 'TEST FAILED: outsider invited staff';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 invitation:=public.manage_staff(tenant,'invite',jsonb_build_object('email',staff_id||'@example.invalid','title','Manager','permissions',permissions,'token_hash',repeat('a',64)));
 perform set_config('request.jwt.claim.sub',outsider::text,true);
 begin perform public.accept_staff_invitation(repeat('a',64));raise exception 'TEST FAILED: wrong email accepted';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',staff_id::text,true);
 membership:=public.accept_staff_invitation(repeat('a',64));
 if exists(select 1 from public.tenant_users where user_id=staff_id) then raise exception 'TEST FAILED: broad membership';end if;
 if public.staff_orders(membership)<>'[]'::jsonb then raise exception 'TEST FAILED: cross tenant orders';end if;
 begin perform public.staff_module_data(membership,'customers');raise exception 'TEST FAILED: ungranted customers read';exception when insufficient_privilege then null;end;
 begin perform public.accept_staff_invitation(repeat('a',64));raise exception 'TEST FAILED: replay accepted';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 permissions:=permissions||'{"catalog":"write","stock":"write"}'::jsonb;
 perform public.manage_staff(tenant,'update',jsonb_build_object('id',membership,'revision',1,'title','Manager','permissions',permissions,'active',true,'notify_orders',true));
 insert into products(id,tenant_id,title,price) values(product_id,tenant,'Fixture product',1000);
 insert into product_variants(id,tenant_id,product_id,stock_qty) values(variant_id,tenant,product_id,0);
 insert into stock_movements(tenant_id,variant_id,delta,reason) values(tenant,variant_id,10,'restock');
 perform set_config('request.jwt.claim.sub',staff_id::text,true);
 perform public.staff_edit(membership,'catalog',product_id,'{"title":"Updated fixture","description":"Test","price":"1200","active":"true","expected_price":"1000","expected_title":"Fixture product"}');
 if (select price from products where id=product_id)<>1200 then raise exception 'TEST FAILED: product edit not persisted';end if;
 perform public.staff_edit(membership,'stock',variant_id,'{"expected":"10","quantity":"8"}');
 if (select stock_qty from product_variants where id=variant_id)<>8 then raise exception 'TEST FAILED: stock not persisted';end if;
 if not exists(select 1 from stock_movements m where m.variant_id=fixture.variant_id and m.tenant_id=tenant and m.delta=-2 and m.staff_id=auth.uid()) then raise exception 'TEST FAILED: missing movement';end if;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform public.manage_staff(tenant,'update',jsonb_build_object('id',membership,'revision',2,'title','Manager','permissions',permissions,'active',false,'notify_orders',false));
 perform set_config('request.jwt.claim.sub',staff_id::text,true);
 begin perform public.staff_orders(membership);raise exception 'TEST FAILED: revoked member read';exception when insufficient_privilege then null;end;
 if has_table_privilege('authenticated','public.staff_access','INSERT') or has_table_privilege('authenticated','public.staff_access','UPDATE') then raise exception 'TEST FAILED: direct write grant';end if;
 if has_function_privilege('anon','public.manage_staff(uuid,text,jsonb)','EXECUTE') then raise exception 'TEST FAILED: anonymous execute';end if;
end $$;
rollback;
