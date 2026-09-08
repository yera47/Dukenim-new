-- Wake the existing bounded sender only while the queue needs work.
-- No secret value belongs in this migration or cron command.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create schema if not exists private;

revoke usage on schema net from public, anon, authenticated;
revoke execute on all functions in schema net from public, anon, authenticated;

create or replace function private.wake_mobile_push_worker()
returns bigint
language plpgsql security invoker set search_path = ''
as $$
declare worker_secret text; request_id bigint;
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
  select net.http_get(
    url := 'https://www.dukenim.kz/api/cron/mobile-push',
    headers := jsonb_build_object('Authorization', 'Bearer ' || worker_secret),
    timeout_milliseconds := 55000
  ) into request_id;
  return request_id;
end;
$$;
revoke all on function private.wake_mobile_push_worker() from public, anon, authenticated;

-- Initially disabled until the matching production secret has been installed
-- and the authorized endpoint has passed its live smoke test.
select cron.schedule('dukenim-mobile-push', '* * * * *', 'select private.wake_mobile_push_worker();');
select cron.alter_job(job_id := (select jobid from cron.job where jobname = 'dukenim-mobile-push'), active := false);
