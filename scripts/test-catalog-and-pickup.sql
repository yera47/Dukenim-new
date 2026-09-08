-- Isolated transactional checks; no auth session created, no fixture survives rollback.
begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.tenant_users where role='owner' limit 1),true);
select set_config('dukenim.test_tenant',(select tenant_id::text from public.tenant_users where role='owner' and user_id=auth.uid() limit 1),true);
update public.tenants set catalog_status='not_started',status='active',plan='basic' where id=current_setting('dukenim.test_tenant')::uuid;
set local role authenticated;
select public.create_catalog_atomic(current_setting('dukenim.test_tenant')::uuid,'Серик Шоп — тест','atelier','mono',null);
do $$ begin
  if not exists(select 1 from public.tenants where id=current_setting('dukenim.test_tenant')::uuid and catalog_status='building' and catalog_name='Серик Шоп — тест') then raise exception 'Catalog not persisted'; end if;
  if not exists(select 1 from public.tenant_storefront_settings where tenant_id=current_setting('dukenim.test_tenant')::uuid and template_key='atelier' and palette_key='mono') then raise exception 'Theme not persisted'; end if;
  begin
    perform public.create_catalog_atomic(current_setting('dukenim.test_tenant')::uuid,'Overwrite','market','mono',null);
    raise exception 'Duplicate accepted';
  exception when raise_exception then
    if sqlerrm <> 'Catalog already created' then raise; end if;
  end;
end $$;
update public.tenant_settings set pickup_location='{"address":"Тестовый адрес","hours":"10–19","preparation":"2 часа","instructions":"","gisUrl":"","yandexUrl":"","embedUrl":""}' where tenant_id=current_setting('dukenim.test_tenant')::uuid;
do $$ begin
  if not exists(select 1 from public.tenant_settings where tenant_id=current_setting('dukenim.test_tenant')::uuid and pickup_location->>'hours'='10–19') then raise exception 'Pickup not persisted'; end if;
end $$;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
do $$ begin
  update public.tenant_settings set pickup_location=null where tenant_id=current_setting('dukenim.test_tenant')::uuid;
  if found then raise exception 'Tenant isolation failed'; end if;
  begin
    perform public.create_catalog_atomic(current_setting('dukenim.test_tenant')::uuid,'Intruder','atelier','mono',null);
    raise exception 'Outsider accepted';
  exception when raise_exception then if sqlerrm <> 'Owner required' then raise; end if; end;
end $$;
reset role;
do $$ declare v_order uuid; begin
  insert into public.orders(tenant_id,source,status,subtotal,total,delivery_cost,payment_status,fulfilment_snapshot)
  values(current_setting('dukenim.test_tenant')::uuid,'offline','new',0,0,0,'pending','{"method":"pickup","pickup":{"address":"Old address"}}') returning id into v_order;
  update public.tenant_settings set pickup_location=null where tenant_id=current_setting('dukenim.test_tenant')::uuid;
  if (select fulfilment_snapshot#>>'{pickup,address}' from public.orders where id=v_order) <> 'Old address' then raise exception 'History changed'; end if;
  begin
    update public.orders set fulfilment_snapshot='{}' where id=v_order;
    raise exception 'Snapshot mutation accepted';
  exception when raise_exception then if sqlerrm <> 'Order fulfilment snapshot is immutable' then raise; end if; end;
  update public.orders set status='confirmed' where id=v_order;
end $$;
rollback;
