begin;
insert into auth.users(id,email) values
  ('ca221855-0000-4000-8000-000000000001','kaspi-confirm@example.test');
insert into public.tenants(id,slug,name,status,plan,catalog_status,catalog_published) values
  ('ca221855-0000-4000-8000-000000000002','kaspi-confirm-rollback','Kaspi confirmation QA','active','basic','ready',true);
insert into public.tenant_users(tenant_id,user_id,role) values
  ('ca221855-0000-4000-8000-000000000002','ca221855-0000-4000-8000-000000000001','owner');
insert into public.orders(id,tenant_id,source,status,subtotal,total,payment_method,payment_status) values
  ('ca221855-0000-4000-8000-000000000003','ca221855-0000-4000-8000-000000000002','online','new',4200,4200,'kaspi','pending');

set local role authenticated;
set local request.jwt.claim.sub='ca221855-0000-4000-8000-000000000001';
select public.manage_kaspi_remote_order('ca221855-0000-4000-8000-000000000003','paid','qa-check-4200');
reset role;
do $$ begin
  if not exists(select 1 from public.orders where id='ca221855-0000-4000-8000-000000000003' and payment_status='paid' and status='confirmed') then
    raise exception 'Kaspi payment did not confirm the order atomically';
  end if;
  if not exists(select 1 from public.platform_audit_events where tenant_id='ca221855-0000-4000-8000-000000000002' and action='kaspi.remote.paid') then
    raise exception 'Kaspi payment audit is missing';
  end if;
end $$;
rollback;
