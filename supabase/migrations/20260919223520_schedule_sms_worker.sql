-- Reuse the existing Vault worker secret. Only a short-lived scoped HMAC
-- reaches pg_net; the persistent secret never enters the request queue.
create or replace function private.wake_sms_worker()
returns bigint
language plpgsql security invoker set search_path = ''
as $$
declare worker_secret text; request_id bigint; stamp text; signature text;
begin
  if not exists (
    select 1 from public.sms_outbox
    where (status = 'pending' and deliver_after <= now())
       or (status = 'processing' and (claimed_at is null or claimed_at < now() - interval '2 minutes'))
  ) then return null; end if;
  select decrypted_secret into worker_secret from vault.decrypted_secrets
    where name = 'dukenim_mobile_push_cron_secret';
  if worker_secret is null or length(worker_secret) < 32 then return null; end if;
  stamp := floor(extract(epoch from clock_timestamp()))::bigint::text;
  signature := encode(extensions.hmac(convert_to('dukenim:sms:' || stamp, 'UTF8'), convert_to(worker_secret, 'UTF8'), 'sha256'), 'hex');
  select net.http_get(
    url := 'https://www.dukenim.kz/api/cron/sms',
    headers := jsonb_build_object('X-Dukenim-Time', stamp, 'X-Dukenim-Signature', signature),
    timeout_milliseconds := 55000
  ) into request_id;
  return request_id;
end;
$$;
revoke all on function private.wake_sms_worker() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from cron.job where jobname = 'dukenim-sms-worker') then
    perform cron.unschedule('dukenim-sms-worker');
  end if;
  perform cron.schedule('dukenim-sms-worker', '* * * * *', 'select private.wake_sms_worker();');
end $$;
