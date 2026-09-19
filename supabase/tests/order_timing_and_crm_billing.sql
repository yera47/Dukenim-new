begin;
do $$
declare
  shop uuid:=gen_random_uuid(); product uuid:=gen_random_uuid(); variant uuid:=gen_random_uuid(); created record;
  basic_shop uuid:=gen_random_uuid(); brand_shop uuid:=gen_random_uuid(); basic_request uuid:=gen_random_uuid(); brand_request uuid:=gen_random_uuid(); charge uuid; paid boolean;
begin
  insert into public.tenants(id,slug,name,phone,status,plan,catalog_published) values
    (shop,'timing-'||shop,'Timing fixture','00000000000','active','basic',true),
    (basic_shop,'crm-basic-'||basic_shop,'CRM basic','00000000000','active','basic',false),
    (brand_shop,'crm-brand-'||brand_shop,'CRM brand','00000000000','active','standard',false);
  insert into public.tenant_settings(tenant_id,pickup_enabled,delivery_enabled) values(shop,true,false);
  insert into public.products(id,tenant_id,title,price,is_active) values(product,shop,'Lunch',2500,true);
  insert into public.product_variants(id,tenant_id,product_id,stock_qty,is_active) values(variant,shop,product,5,true);

  select * into created from public.create_storefront_order_v2(shop,'Buyer','77000000000','pickup','',null,'cash',jsonb_build_array(jsonb_build_object('variant_id',variant,'qty',1)),now()+interval '1 hour');
  if not exists(select 1 from public.orders where id=created.order_id and timing_mode='scheduled' and requested_for is not null) then raise exception 'TEST FAILED: requested time missing';end if;
  begin
    perform public.create_storefront_order_v2(shop,'Buyer','77000000000','pickup','',null,'cash',jsonb_build_array(jsonb_build_object('variant_id',variant,'qty',1)),now()-interval '1 hour');
    raise exception 'TEST FAILED: past time accepted';
  exception when others then if sqlerrm<>'Requested time unavailable' then raise;end if;end;

  insert into public.crm_integration_requests(id,tenant_id,provider,status) values
    (basic_request,basic_shop,'poster','submitted'),(brand_request,brand_shop,'iiko','submitted');
  update public.crm_integration_requests set status='connected' where id in(basic_request,brand_request);
  if not exists(select 1 from public.crm_setup_charges where integration_request_id=basic_request and status='awaiting_payment' and amount_kzt=70000) then raise exception 'TEST FAILED: basic charge missing';end if;
  if not exists(select 1 from public.crm_setup_charges where integration_request_id=brand_request and status='included') then raise exception 'TEST FAILED: brand inclusion missing';end if;
  select id into charge from public.crm_setup_charges where integration_request_id=basic_request;
  begin perform public.confirm_crm_setup_payment('wrong-amount','order.paid','{}',basic_shop,charge,'polar-order-wrong',69999);raise exception 'TEST FAILED: wrong amount accepted';exception when others then if sqlerrm<>'Invalid CRM setup amount' then raise;end if;end;
  paid:=public.confirm_crm_setup_payment('crm-paid','order.paid','{}',basic_shop,charge,'polar-order',70000);
  if not paid or not exists(select 1 from public.crm_setup_charges where id=charge and status='paid' and paid_at is not null) then raise exception 'TEST FAILED: payment not persisted';end if;
  if public.confirm_crm_setup_payment('crm-paid','order.paid','{}',basic_shop,charge,'polar-order',70000) then raise exception 'TEST FAILED: webhook replay applied';end if;
end $$;
rollback;
