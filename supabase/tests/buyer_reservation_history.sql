begin;
insert into auth.users(id) values ('cb101010-0000-4000-8000-000000000001'),('cb101010-0000-4000-8000-000000000009');
insert into public.tenants(id,slug,name,phone,status,plan,catalog_status) values ('cb101010-0000-4000-8000-000000000002','reservation-test-rollback','Reservation test','00000000000','active','basic','not_started');
insert into public.tenant_users(tenant_id,user_id,role) values ('cb101010-0000-4000-8000-000000000002','cb101010-0000-4000-8000-000000000001','owner');
insert into public.tenant_settings(tenant_id,pickup_enabled,delivery_enabled) values ('cb101010-0000-4000-8000-000000000002',false,false) on conflict(tenant_id) do update set pickup_enabled=false,delivery_enabled=false;
insert into public.reservation_settings(tenant_id,enabled,hold_hours,location) values ('cb101010-0000-4000-8000-000000000002',true,1,'{"address":"Алматы, улица 10","hours":"10–20"}');
insert into public.products(id,tenant_id,title,price) values ('cb101010-0000-4000-8000-000000000003','cb101010-0000-4000-8000-000000000002','Test',1000);
insert into public.product_variants(id,tenant_id,product_id) values ('cb101010-0000-4000-8000-000000000004','cb101010-0000-4000-8000-000000000002','cb101010-0000-4000-8000-000000000003');
insert into public.stock_movements(tenant_id,variant_id,delta,reason) values ('cb101010-0000-4000-8000-000000000002','cb101010-0000-4000-8000-000000000004',5,'restock');
-- Setup can offer only reservations; no accidental pickup/payment activation.
delete from public.reservation_settings where tenant_id='cb101010-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claim.sub='cb101010-0000-4000-8000-000000000001';
select public.create_catalog_setup('cb101010-0000-4000-8000-000000000002','Test','atelier','mono',null,null,'{"delivery":false,"pickup":false,"reservation":true,"holdHours":1,"address":"Алматы, улица 10","hours":"10–20","preparation":"После подтверждения"}','later');
select public.publish_catalog('cb101010-0000-4000-8000-000000000002');
reset role;
do $$ begin
 if exists(select 1 from public.tenant_settings where tenant_id='cb101010-0000-4000-8000-000000000002' and (pickup_enabled or payment_online)) then raise exception 'Unexpected pickup/payment';end if;
end $$;
create temporary table reservation_test_ids as select * from public.create_buyer_reservation('cb101010-0000-4000-8000-000000000002','cb101010-0000-4000-8000-000000000005','Серик','00000000001','[{"variant_id":"cb101010-0000-4000-8000-000000000004","qty":2}]','cb101010-0000-4000-8000-000000000009',repeat('a',64));

do $$ begin
 if not exists(select 1 from public.buyer_order_access where order_id=(select order_id from reservation_test_ids) and user_id='cb101010-0000-4000-8000-000000000009') then raise exception 'Reservation ownership missing';end if;
 if jsonb_array_length(public.buyer_history('cb101010-0000-4000-8000-000000000002','cb101010-0000-4000-8000-000000000009',repeat('b',64),0)->'orders')<>1 then raise exception 'Reservation not restored across browser';end if;
 begin perform public.create_buyer_reservation('cb101010-0000-4000-8000-000000000002','cb101010-0000-4000-8000-000000000005','Серик','00000000001','[{"variant_id":"cb101010-0000-4000-8000-000000000004","qty":2}]',null,repeat('c',64));raise exception 'Ownership hijack accepted';exception when others then if sqlerrm<>'Request conflict' then raise;end if;end;
end $$;
rollback;
