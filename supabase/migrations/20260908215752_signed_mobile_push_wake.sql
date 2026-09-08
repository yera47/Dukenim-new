-- Managed net ACLs cannot be narrowed by postgres on this project.
-- Keep the persistent secret out of net queues: only a 90-second scoped HMAC is sent.
create or replace function private.wake_mobile_push_worker()
returns bigint
language plpgsql security invoker set search_path = ''
as $$
declare worker_secret text; request_id bigint; stamp text; signature text;
begin
  if not exists (
    select 1 from public.mobile_notification_outbox
    where (status = 'pending' and deliver_after <= now())
       or (status = 'processing' and (claimed_at is null or claimed_at < now() - interval '2 minutes'))
       or (status = 'sent' and receipt_state = 'pending' and sent_at <= now() - interval '15 minutes')
  ) then return null; end if;
  select decrypted_secret into worker_secret from vault.decrypted_secrets
    where name = 'dukenim_mobile_push_cron_secret';
  if worker_secret is null or length(worker_secret) < 32 then return null; end if;
  stamp := floor(extract(epoch from clock_timestamp()))::bigint::text;
  signature := encode(extensions.hmac(convert_to('dukenim:mobile-push:' || stamp, 'UTF8'), convert_to(worker_secret, 'UTF8'), 'sha256'), 'hex');
  select net.http_get(
    url := 'https://www.dukenim.kz/api/cron/mobile-push',
    headers := jsonb_build_object('X-Dukenim-Time', stamp, 'X-Dukenim-Signature', signature),
    timeout_milliseconds := 55000
  ) into request_id;
  return request_id;
end;
$$;
revoke all on function private.wake_mobile_push_worker() from public, anon, authenticated;
