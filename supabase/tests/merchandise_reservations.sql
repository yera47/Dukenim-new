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
create temporary table reservation_test_ids as select * from public.create_merchandise_reservation('cb101010-0000-4000-8000-000000000002','cb101010-0000-4000-8000-000000000005','Серик','00000000001','[{"variant_id":"cb101010-0000-4000-8000-000000000004","qty":2}]');
do $$ begin
 if (select stock_qty from public.product_variants where id='cb101010-0000-4000-8000-000000000004')<>3 then raise exception 'Hold missing';end if;
 if not exists(select 1 from public.mobile_notification_outbox where data->>'orderId'=(select order_id::text from reservation_test_ids) and title='Новая бронь' and data->>'reservation'='true') then raise exception 'Reservation notification context missing';end if;
 if exists(select 1 from public.orders o join reservation_test_ids t on t.order_id=o.id where o.payment_status<>'pending') then raise exception 'False payment';end if;
 perform public.create_merchandise_reservation('cb101010-0000-4000-8000-000000000002','cb101010-0000-4000-8000-000000000005','Серик','00000000001','[{"variant_id":"cb101010-0000-4000-8000-000000000004","qty":2}]');
 if (select stock_qty from public.product_variants where id='cb101010-0000-4000-8000-000000000004')<>3 then raise exception 'Replay debited twice';end if;
 begin
  perform public.create_merchandise_reservation('cb101010-0000-4000-8000-000000000002','cb101010-0000-4000-8000-000000000005','Серик','00000000001','[{"variant_id":"cb101010-0000-4000-8000-000000000004","qty":1}]');
  raise exception 'Conflict accepted';
 exception when others then if sqlerrm<>'Request conflict' then raise;end if;end;
 begin
  update public.orders set status='done',payment_status='paid' where id=(select order_id from reservation_test_ids);
  raise exception 'Reserved order bypass';
 exception when others then if sqlerrm<>'Use reservation controls' then raise;end if;end;
end $$;
grant select on reservation_test_ids to authenticated;
set local role authenticated;
set local request.jwt.claim.sub='cb101010-0000-4000-8000-000000000009';
do $$ begin
 if exists(select 1 from public.merchandise_reservations) then raise exception 'Cross tenant leak';end if;
 begin
  perform public.manage_merchandise_reservation((select order_id from reservation_test_ids),'collect');
  raise exception 'Cross tenant collect';
 exception when others then if sqlerrm<>'Owner required' then raise;end if;end;
end $$;
set local request.jwt.claim.sub='cb101010-0000-4000-8000-000000000001';
select public.manage_merchandise_reservation((select order_id from reservation_test_ids),'confirm');
select public.manage_merchandise_reservation((select order_id from reservation_test_ids),'collect');
select public.manage_merchandise_reservation((select order_id from reservation_test_ids),'collect');
reset role;
do $$ begin
 if (select stock_qty from public.product_variants where id='cb101010-0000-4000-8000-000000000004')<>3 then raise exception 'Collection double debit';end if;
 if (select total_spent from public.customers where tenant_id='cb101010-0000-4000-8000-000000000002')<>2000 then raise exception 'Wrong customer paid total';end if;
end $$;
delete from reservation_test_ids;
insert into reservation_test_ids select * from public.create_merchandise_reservation('cb101010-0000-4000-8000-000000000002','cb101010-0000-4000-8000-000000000006','Серик','00000000001','[{"variant_id":"cb101010-0000-4000-8000-000000000004","qty":2}]');
update public.merchandise_reservations set expires_at=now()-interval '1 second' where order_id=(select order_id from reservation_test_ids);
select dukenim_internal.expire_merchandise_reservations();
select dukenim_internal.expire_merchandise_reservations();
do $$ begin
 if (select stock_qty from public.product_variants where id='cb101010-0000-4000-8000-000000000004')<>3 then raise exception 'Expiry restore wrong';end if;
 if not exists(select 1 from public.merchandise_reservations where order_id=(select order_id from reservation_test_ids) and status='expired') then raise exception 'Expiry missing';end if;
 if has_function_privilege('anon','public.create_merchandise_reservation(uuid,uuid,text,text,jsonb)','execute') or has_table_privilege('anon','public.merchandise_reservations','select') then raise exception 'Anonymous privilege leak';end if;
end $$;
delete from reservation_test_ids;
insert into reservation_test_ids select * from public.create_merchandise_reservation('cb101010-0000-4000-8000-000000000002','cb101010-0000-4000-8000-000000000007','Серик','00000000001','[{"variant_id":"cb101010-0000-4000-8000-000000000004","qty":1}]');
set local role authenticated;
set local request.jwt.claim.sub='cb101010-0000-4000-8000-000000000001';
select public.manage_merchandise_reservation((select order_id from reservation_test_ids),'cancel');
select public.manage_merchandise_reservation((select order_id from reservation_test_ids),'cancel');
reset role;
do $$ begin
 if (select stock_qty from public.product_variants where id='cb101010-0000-4000-8000-000000000004')<>3 then raise exception 'Cancellation not exact once';end if;
 begin
  perform public.create_merchandise_reservation('cb101010-0000-4000-8000-000000000002','cb101010-0000-4000-8000-000000000008','Серик','00000000001','[{"variant_id":"cb101010-0000-4000-8000-000000000004","qty":4}]');
  raise exception 'Oversold reservation';
 exception when others then if sqlerrm<>'Variant unavailable' then raise;end if;end;
end $$;
rollback;
