-- Create Auth users first in Supabase Dashboard, then replace these UUIDs with auth.users IDs.
-- The seed is idempotent and uses fixed demo IDs so related records stay stable.
insert into public.tenants(id,slug,name,tagline,city,phone,whatsapp,instagram,plan,status)
values('10000000-0000-0000-0000-000000000001','demo-shop','Dukenim Demo','Стиль рядом с вами','Кызылорда','+7 777 000 00 00','77000000000','dukenim.demo','standard','active')
on conflict(id) do nothing;
insert into public.tenant_settings(tenant_id,delivery_enabled,pickup_enabled,min_order)
values('10000000-0000-0000-0000-000000000001',true,true,5000) on conflict(tenant_id) do nothing;
insert into public.categories(id,tenant_id,name,slug,sort_order)
values('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Новинки','new',1) on conflict(id) do nothing;
insert into public.products(id,tenant_id,category_id,title,description,price,is_featured)
values('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Базовая футболка','Демонстрационный товар',12990,true) on conflict(id) do nothing;
insert into public.product_variants(id,product_id,tenant_id,size,color,sku,stock_qty)
values('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','M','Белый','DEMO-TS-M',0) on conflict(id) do nothing;
insert into public.stock_movements(tenant_id,variant_id,delta,reason)
select '10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',10,'restock'
where not exists(select 1 from public.stock_movements where variant_id='40000000-0000-0000-0000-000000000001');

-- After creating demo accounts, run with their real UUIDs:
-- insert into profiles(user_id,role) values('<owner-auth-uuid>','owner'),('<superadmin-auth-uuid>','superadmin');
-- insert into tenant_users(tenant_id,user_id,role) values('10000000-0000-0000-0000-000000000001','<owner-auth-uuid>','owner');
