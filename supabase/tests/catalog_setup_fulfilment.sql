begin;
insert into auth.users(id) values ('cb090909-0000-4000-8000-000000000001');
insert into public.tenants(id,slug,name,phone,status,plan,catalog_status) values ('cb090909-0000-4000-8000-000000000002','setup-test-rollback','Setup test','00000000000','active','basic','not_started');
insert into public.tenant_users(tenant_id,user_id,role) values ('cb090909-0000-4000-8000-000000000002','cb090909-0000-4000-8000-000000000001','owner');
insert into public.tenant_settings(tenant_id) values ('cb090909-0000-4000-8000-000000000002') on conflict do nothing;
set local role authenticated;
set local request.jwt.claim.sub='cb090909-0000-4000-8000-000000000001';
select public.create_catalog_setup('cb090909-0000-4000-8000-000000000002','Test','atelier','mono',null,null,'{"delivery":true,"pickup":true,"zone":"Алматы","cost":"1500","eta":"Завтра","address":"Алматы, улица 10","hours":"10–20","preparation":"Через 2 часа","gisUrl":"","yandexUrl":""}'::jsonb,'later');
do $$ begin
 if public.is_storefront_public('cb090909-0000-4000-8000-000000000002') then raise exception 'Premature publication';end if;
 if (select payment_online from public.tenant_settings where tenant_id='cb090909-0000-4000-8000-000000000002') then raise exception 'Payment activated';end if;
 if not exists(select 1 from public.delivery_zones where tenant_id='cb090909-0000-4000-8000-000000000002' and cost=1500 and is_active) then raise exception 'Zone not saved';end if;
 begin
  perform public.publish_catalog('cb090909-0000-4000-8000-000000000002');
  raise exception 'Empty store published';
 exception when others then if sqlerrm<>'Add an available product' then raise;end if;end;
end $$;
reset role;
insert into public.products(id,tenant_id,title,price) values ('cb090909-0000-4000-8000-000000000003','cb090909-0000-4000-8000-000000000002','Test',1000);
do $$ begin
 begin
  insert into public.orders(tenant_id,total,subtotal,source) values('cb090909-0000-4000-8000-000000000002',1000,1000,'online');
  raise exception 'Draft accepted order';
 exception when others then if sqlerrm<>'Store is not published' then raise;end if;end;
end $$;
insert into public.product_variants(id,tenant_id,product_id) values ('cb090909-0000-4000-8000-000000000004','cb090909-0000-4000-8000-000000000002','cb090909-0000-4000-8000-000000000003');
insert into public.stock_movements(tenant_id,variant_id,delta,reason) values ('cb090909-0000-4000-8000-000000000002','cb090909-0000-4000-8000-000000000004',2,'restock');
set local role anon;
do $$ begin
 if exists(select 1 from public.tenants where id='cb090909-0000-4000-8000-000000000002') then raise exception 'Draft tenant publicly readable';end if;
 if exists(select 1 from public.products where tenant_id='cb090909-0000-4000-8000-000000000002') then raise exception 'Draft products publicly readable';end if;
end $$;
reset role;
set local role authenticated;
set local request.jwt.claim.sub='cb090909-0000-4000-8000-000000000001';
select public.publish_catalog('cb090909-0000-4000-8000-000000000002');
do $$ begin
 if not public.is_storefront_public('cb090909-0000-4000-8000-000000000002') then raise exception 'Publication missing';end if;
end $$;
reset role;
rollback;
