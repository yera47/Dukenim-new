-- Keep the existing mobile order deep link; identify unpaid reservations honestly.
create or replace function public.queue_mobile_order_notification()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare is_reservation boolean := coalesce(new.fulfilment_snapshot->>'reservation','false') = 'true';
begin
 insert into public.mobile_notification_outbox(tenant_id,user_id,kind,title,body,data)
 select new.tenant_id,tu.user_id,'order_created',
 case when is_reservation then 'Новая бронь' when new.delivery_method::text='pickup' then 'Самовывоз' else 'Новый заказ' end,
 'Заказ №'||coalesce(new.order_number::text,'—')||
 case when is_reservation then ' · бронь без онлайн-оплаты'
 when new.payment_status::text='paid' then ' · оплачен' else ' · ожидает оплаты' end,
 jsonb_build_object('orderId',new.id,'tenantId',new.tenant_id,'method',new.delivery_method,'paymentStatus',new.payment_status,'reservation',is_reservation)
 from public.tenant_users tu where tu.tenant_id=new.tenant_id and tu.role='owner' and new.source::text='online';
 return new;
end;
$$;
revoke all on function public.queue_mobile_order_notification() from public,anon,authenticated;
