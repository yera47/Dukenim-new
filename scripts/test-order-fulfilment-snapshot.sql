-- Real order RPC with synthetic product/customer, entirely rolled back.
begin;
do $$ declare t uuid;p uuid;v uuid;r record; begin
  select tenant_id into t from public.tenant_users where role='owner' limit 1;
  update public.tenants set status='active' where id=t;
  update public.tenant_settings set pickup_enabled=true,min_order=0,pickup_location='{"address":"Test collection point","hours":"10–19","preparation":"2h","instructions":"","gisUrl":"","yandexUrl":"","embedUrl":""}' where tenant_id=t;
  insert into public.products(tenant_id,title,price,is_active) values(t,'Synthetic acceptance product',1000,true) returning id into p;
  insert into public.product_variants(tenant_id,product_id,is_active) values(t,p,true) returning id into v;
  insert into public.stock_movements(tenant_id,variant_id,delta,reason) values(t,v,3,'restock');
  select * into r from public.create_storefront_order_v2(t,'Synthetic buyer','+70000000000','pickup','',null,'cash',jsonb_build_array(jsonb_build_object('variant_id',v,'qty',2)));
  if r.total<>2000 then raise exception 'Incorrect total'; end if;
  if not exists(select 1 from public.orders where id=r.order_id and payment_status='pending' and fulfilment_snapshot#>>'{pickup,address}'='Test collection point') then raise exception 'Order snapshot missing'; end if;
  if (select stock_qty from public.product_variants where id=v)<>1 then raise exception 'Stock mismatch'; end if;
  if not exists(select 1 from public.mobile_notification_outbox where tenant_id=t and data->>'orderId'=r.order_id::text and data->>'method'='pickup' and body not like '%Synthetic buyer%') then raise exception 'Notification missing or exposes customer'; end if;
  update public.tenant_settings set pickup_location=null where tenant_id=t;
  if (select fulfilment_snapshot#>>'{pickup,address}' from public.orders where id=r.order_id)<>'Test collection point' then raise exception 'Snapshot changed'; end if;
end $$;
rollback;
