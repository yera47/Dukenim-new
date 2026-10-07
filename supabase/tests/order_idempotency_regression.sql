-- Transactional replay/conflict/tenant-scope regression. Always rolls back.
begin;
do $$
declare
  shop_a uuid := gen_random_uuid();
  shop_b uuid := gen_random_uuid();
  product_a uuid := gen_random_uuid();
  product_b uuid := gen_random_uuid();
  variant_a uuid := gen_random_uuid();
  variant_b uuid := gen_random_uuid();
  request_key uuid := gen_random_uuid();
  first_order record;
  replayed_order record;
  other_tenant_order record;
begin
  insert into public.tenants(id,slug,name,phone,status,plan,catalog_published) values
    (shop_a,'idempotency-a-'||shop_a,'Idempotency A','00000000000','active','basic',true),
    (shop_b,'idempotency-b-'||shop_b,'Idempotency B','00000000000','active','basic',true);
  insert into public.tenant_settings(tenant_id,pickup_enabled,delivery_enabled) values
    (shop_a,true,false),(shop_b,true,false);
  insert into public.products(id,tenant_id,title,price,is_active) values
    (product_a,shop_a,'Fixture A',1000,true),(product_b,shop_b,'Fixture B',1000,true);
  insert into public.product_variants(id,tenant_id,product_id,stock_qty,is_active) values
    (variant_a,shop_a,product_a,3,true),(variant_b,shop_b,product_b,3,true);

  select * into first_order from public.create_buyer_order_idempotent(
    shop_a,'Buyer','77000000000','pickup','',null,'cash',
    jsonb_build_array(jsonb_build_object('variant_id',variant_a,'qty',1)),null,null,repeat('c',64),request_key
  );
  select * into replayed_order from public.create_buyer_order_idempotent(
    shop_a,'Buyer','77000000000','pickup','',null,'cash',
    jsonb_build_array(jsonb_build_object('variant_id',variant_a,'qty',1)),null,null,repeat('a',64),request_key
  );

  if first_order.order_id is distinct from replayed_order.order_id then
    raise exception 'TEST FAILED: lost-response replay created another order';
  end if;
  if (select count(*) from public.orders where tenant_id=shop_a) <> 1
    or (select stock_qty from public.product_variants where id=variant_a) <> 2 then
    raise exception 'TEST FAILED: replay duplicated order or stock movement';
  end if;

  begin
    perform public.create_buyer_order_idempotent(
      shop_a,'Buyer','77000000000','pickup','',null,'cash',
      jsonb_build_array(jsonb_build_object('variant_id',variant_a,'qty',2)),null,null,repeat('a',64),request_key
    );
    raise exception 'TEST FAILED: same key accepted a different payload';
  exception when sqlstate '22023' then
    if sqlerrm <> 'Idempotency key conflicts with another checkout' then raise; end if;
  end;

  select * into other_tenant_order from public.create_buyer_order_idempotent(
    shop_b,'Buyer','77000000000','pickup','',null,'cash',
    jsonb_build_array(jsonb_build_object('variant_id',variant_b,'qty',1)),null,null,repeat('b',64),request_key
  );
  if other_tenant_order.order_id is null or other_tenant_order.order_id=first_order.order_id then
    raise exception 'TEST FAILED: idempotency key was not tenant-scoped';
  end if;
end
$$;
rollback;
