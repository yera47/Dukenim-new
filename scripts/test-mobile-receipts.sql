begin;
do $$ declare actor uuid; shop uuid; notification uuid; begin
 select user_id,tenant_id into actor,shop from public.tenant_users where role='owner' limit 1;
 if actor is null then raise exception 'No owner fixture'; end if;
 insert into public.mobile_notification_outbox(tenant_id,user_id,kind,title,body,status,claimed_at)
 values(shop,actor,'order_created','Synthetic','Synthetic','processing',now()-interval '3 minutes') returning id into notification;
 update public.mobile_notification_outbox set status='failed',receipt_state='unknown' where id=notification and status='processing' and claimed_at<now()-interval '2 minutes';
 if not exists(select 1 from public.mobile_notification_outbox where id=notification and status='failed' and receipt_state='unknown') then raise exception 'Lease recovery failed'; end if;
 update public.mobile_notification_outbox set status='sent',expo_tickets='[{"id":"fixture-ticket","deviceId":"11111111-1111-4111-8111-111111111111"}]',receipt_state='accepted' where id=notification;
 if not exists(select 1 from public.mobile_notification_outbox where id=notification and jsonb_array_length(expo_tickets)=1 and receipt_state='accepted') then raise exception 'Receipt save/read failed'; end if;
 perform set_config('request.jwt.claim.sub',actor::text,true);
end $$;
set local role authenticated;
do $$ begin
 if exists(select 1 from public.mobile_notification_outbox where user_id<>auth.uid()) then raise exception 'Other recipient visible'; end if;
 begin
  update public.mobile_notification_outbox set receipt_state='accepted';
  raise exception 'Owner can forge delivery status';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
