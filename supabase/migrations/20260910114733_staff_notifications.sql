-- Staff operational access follows the store's actual entitlement.
do $$
declare signature text; definition text; variable text;
begin
 foreach signature in array array['public.staff_orders(uuid)','public.staff_order_status(uuid,uuid,public.order_status,public.order_status)','public.staff_module_data(uuid,text)','public.staff_edit(uuid,text,uuid,jsonb)'] loop
  variable:=case when signature like '%staff_orders(%' or signature like '%staff_order_status(%' then 'membership' else 'member' end;
  definition:=pg_get_functiondef(signature::regprocedure);
  definition:=replace(definition,'if '||variable||'.id is null or','if '||variable||'.id is null or not exists(select 1 from public.tenants t where t.id='||variable||'.tenant_id and (t.status=''active'' or (t.status=''trial'' and t.trial_ends_at>now()))) or');
  execute definition;
 end loop;
end $$;
create function public.can_notify_staff(p_tenant uuid,p_user uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from staff_access s join tenants t on t.id=s.tenant_id where s.tenant_id=p_tenant and s.user_id=p_user and s.active and s.notify_orders and s.permissions->>'orders' in ('read','write') and (t.status='active' or (t.status='trial' and t.trial_ends_at>now())));
$$;
revoke all on function public.can_notify_staff(uuid,uuid) from public,anon,authenticated;
grant execute on function public.can_notify_staff(uuid,uuid) to service_role;
create function public.queue_staff_order_notification() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.source::text='online' then
 insert into mobile_notification_outbox(tenant_id,user_id,kind,title,body,data)
 select new.tenant_id,s.user_id,'order_created','Новый заказ','Проверьте наличие и начните сборку заказа №'||coalesce(new.order_number::text,'—'),jsonb_build_object('orderId',new.id,'tenantId',new.tenant_id,'staff',true)
 from staff_access s where s.tenant_id=new.tenant_id and public.can_notify_staff(new.tenant_id,s.user_id)
 and not exists(select 1 from tenant_users tu where tu.tenant_id=new.tenant_id and tu.user_id=s.user_id and tu.role='owner');
 end if;
 return new;
end $$;
revoke all on function public.queue_staff_order_notification() from public,anon,authenticated;
create trigger staff_order_notification after insert on public.orders for each row execute function public.queue_staff_order_notification();
