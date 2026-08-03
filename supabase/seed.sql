-- Local/demo credentials (change immediately outside local development):
-- owner@dukenim.kz / DukenimOwner123!
-- root@dukenim.kz  / DukenimRoot123!

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000101','authenticated','authenticated','owner@dukenim.kz',crypt('DukenimOwner123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000102','authenticated','authenticated','root@dukenim.kz',crypt('DukenimRoot123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now())
on conflict(id) do update set email=excluded.email,encrypted_password=excluded.encrypted_password,updated_at=now();

insert into auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
values
('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000101','owner@dukenim.kz','{"sub":"00000000-0000-0000-0000-000000000101","email":"owner@dukenim.kz"}','email',now(),now(),now()),
('00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000102','root@dukenim.kz','{"sub":"00000000-0000-0000-0000-000000000102","email":"root@dukenim.kz"}','email',now(),now(),now())
on conflict(provider_id,provider) do nothing;

insert into public.profiles(user_id,role) values
('00000000-0000-0000-0000-000000000101','owner'),('00000000-0000-0000-0000-000000000102','superadmin')
on conflict(user_id) do update set role=excluded.role;

insert into public.tenants(id,slug,name,tagline,city,phone,whatsapp,instagram,plan,status)
values('10000000-0000-0000-0000-000000000001','demo-shop','MEREY','Вещи, которые остаются с вами','Кызылорда','+7 777 000 00 00','77000000000','merey.kz','standard','active')
on conflict(id) do update set name=excluded.name,tagline=excluded.tagline;
insert into public.tenant_users(tenant_id,user_id,role) values('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000101','owner') on conflict(tenant_id,user_id) do nothing;
insert into public.tenant_settings(tenant_id,delivery_enabled,pickup_enabled,payment_online,min_order) values('10000000-0000-0000-0000-000000000001',true,true,true,5000) on conflict(tenant_id) do nothing;
insert into public.categories(id,tenant_id,name,slug,sort_order) values('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Новинки','new',1) on conflict(id) do nothing;
insert into public.products(id,tenant_id,category_id,title,description,price,old_price,is_featured) values('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Жакет Essential','Структурный жакет свободного кроя',42900,49900,true) on conflict(id) do nothing;
insert into public.product_variants(id,product_id,tenant_id,size,color,sku,stock_qty) values('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','M','Графит','MEREY-JACKET-M',0) on conflict(id) do nothing;
insert into public.stock_movements(tenant_id,variant_id,delta,reason) select '10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',10,'restock' where not exists(select 1 from public.stock_movements where variant_id='40000000-0000-0000-0000-000000000001');
