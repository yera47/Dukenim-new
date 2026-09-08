-- No HTTP request is sent: pg_net starts requests only after commit.
begin;
do $$ declare actor uuid; shop uuid; request_id bigint; payload jsonb; worker_secret text; expected text; begin
 select user_id,tenant_id into actor,shop from public.tenant_users where role='owner' limit 1;
 if actor is null then raise exception 'No owner fixture'; end if;
 insert into public.mobile_notification_outbox(tenant_id,user_id,kind,title,body,status,deliver_after)
 values(shop,actor,'order_created','Synthetic','Synthetic','pending',now());
 request_id := private.wake_mobile_push_worker();
 if request_id is null then raise exception 'Pending queue did not wake'; end if;
 select headers into payload from net.http_request_queue where id=request_id;
 select decrypted_secret into worker_secret from vault.decrypted_secrets where name='dukenim_mobile_push_cron_secret';
 expected := encode(extensions.hmac(convert_to('dukenim:mobile-push:' || (payload->>'X-Dukenim-Time'),'UTF8'),convert_to(worker_secret,'UTF8'),'sha256'),'hex');
 if payload->>'X-Dukenim-Signature' is distinct from expected then raise exception 'Incorrect signed request'; end if;
 if position(worker_secret in payload::text)>0 or payload ? 'Authorization' then raise exception 'Persistent key leaked to request'; end if;
end $$;
set local role authenticated;
do $$ begin
 begin perform private.wake_mobile_push_worker(); raise exception 'Owner can invoke scheduler';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
