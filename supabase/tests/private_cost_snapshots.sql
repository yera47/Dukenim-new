-- Run in one transaction. All fixtures, orders and push events are rolled back.
begin;
insert into auth.users(id) values ('cc090909-0000-4000-8000-000000000001');
insert into public.tenants(id,slug,name,phone) values ('cc090909-0000-4000-8000-000000000002','cost-test-rollback','Cost test','00000000000');
insert into public.tenant_users(tenant_id,user_id,role) values ('cc090909-0000-4000-8000-000000000002','cc090909-0000-4000-8000-000000000001','owner');
insert into public.products(id,tenant_id,title,price) values ('cc090909-0000-4000-8000-000000000003','cc090909-0000-4000-8000-000000000002','Test',1000);
insert into public.product_variants(id,tenant_id,product_id) values ('cc090909-0000-4000-8000-000000000004','cc090909-0000-4000-8000-000000000002','cc090909-0000-4000-8000-000000000003');
set local role authenticated;
set local request.jwt.claim.sub='cc090909-0000-4000-8000-000000000001';
insert into public.variant_costs(variant_id,tenant_id,unit_cost) values ('cc090909-0000-4000-8000-000000000004','cc090909-0000-4000-8000-000000000002',400);
do $$ begin
 if (select unit_cost from public.variant_costs where variant_id='cc090909-0000-4000-8000-000000000004')<>400 then raise exception 'Owner cost read failed';end if;
end $$;
reset role;
insert into public.orders(id,tenant_id,total,subtotal) values ('cc090909-0000-4000-8000-000000000005','cc090909-0000-4000-8000-000000000002',2000,2000);
insert into public.order_items(id,tenant_id,order_id,variant_id,title_snapshot,price_snapshot,qty) values ('cc090909-0000-4000-8000-000000000006','cc090909-0000-4000-8000-000000000002','cc090909-0000-4000-8000-000000000005','cc090909-0000-4000-8000-000000000004','Test',1000,2);
update public.variant_costs set unit_cost=900 where variant_id='cc090909-0000-4000-8000-000000000004';
do $$ begin
 if (select unit_cost from public.order_item_costs where order_item_id='cc090909-0000-4000-8000-000000000006') is distinct from 400 then raise exception 'Snapshot changed';end if;
 if has_table_privilege('anon','public.variant_costs','select') or has_table_privilege('authenticated','public.order_item_costs','update') then raise exception 'Unsafe grant';end if;
end $$;
set local role authenticated;
set local request.jwt.claim.sub='cc090909-0000-4000-8000-000000000007';
do $$ begin
 if exists(select 1 from public.variant_costs where variant_id='cc090909-0000-4000-8000-000000000004') or exists(select 1 from public.order_item_costs where order_item_id='cc090909-0000-4000-8000-000000000006') then raise exception 'Foreign cost visible';end if;
end $$;
reset role;
rollback;
