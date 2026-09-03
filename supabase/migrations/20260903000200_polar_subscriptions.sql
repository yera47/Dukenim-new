-- Real Polar.sh subscription integration: map tenants/subscriptions to Polar identities and
-- record every processed webhook delivery so retried deliveries never apply an event twice.
-- No Polar secret, product id or customer data is present in this file; it only adds columns
-- and an idempotency ledger. Safe to run against production at any time; it changes no data.

alter table public.tenants
  add column if not exists polar_customer_id text;

alter table public.subscriptions
  add column if not exists polar_subscription_id text,
  add column if not exists polar_product_id text,
  add column if not exists cancel_at_period_end boolean not null default false;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'tenants_polar_customer_id_key'
  ) then
    alter table public.tenants
      add constraint tenants_polar_customer_id_key unique (polar_customer_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_polar_subscription_id_key'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_polar_subscription_id_key unique (polar_subscription_id);
  end if;
end $$;

create table if not exists public.polar_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null check (char_length(event_type) between 1 and 80),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_polar_subscription_idx on public.subscriptions(polar_subscription_id);
create index if not exists tenants_polar_customer_idx on public.tenants(polar_customer_id);
create index if not exists polar_webhook_events_created_idx on public.polar_webhook_events(created_at desc);

alter table public.polar_webhook_events enable row level security;

drop policy if exists polar_webhook_events_root_read on public.polar_webhook_events;
create policy polar_webhook_events_root_read on public.polar_webhook_events
  for select to authenticated
  using (public.is_superadmin());

-- Only the service-role webhook handler writes here; no insert/update policy is granted to
-- authenticated or anon, so application/browser clients cannot forge processed-event rows.

-- Apply each signed delivery atomically. Recording the delivery and changing access in one
-- transaction prevents a transient database error from permanently swallowing a Polar retry.
create or replace function public.process_polar_subscription_event(
  p_event_id text,
  p_event_type text,
  p_payload jsonb,
  p_tenant_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_product_id text,
  p_plan public.tenant_plan,
  p_subscription_status text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid := p_tenant_id;
begin
  insert into public.polar_webhook_events(event_id, event_type, payload)
  values (p_event_id, p_event_type, p_payload)
  on conflict (event_id) do nothing;

  if not found then
    return false;
  end if;

  if v_tenant_id is null then
    select id into v_tenant_id
    from public.tenants
    where polar_customer_id = p_customer_id;
  end if;

  if v_tenant_id is null or not exists (select 1 from public.tenants where id = v_tenant_id) then
    raise exception 'Polar tenant mapping not found';
  end if;

  if p_subscription_status in ('active', 'trialing') then
    update public.subscriptions
    set status = 'canceled'
    where tenant_id = v_tenant_id
      and status = 'active'
      and polar_subscription_id is distinct from p_subscription_id;

    insert into public.subscriptions(
      tenant_id, plan, status, started_at, current_period_end,
      polar_subscription_id, polar_product_id, cancel_at_period_end
    ) values (
      v_tenant_id, p_plan, 'active', coalesce(p_period_start, now()), p_period_end,
      p_subscription_id, p_product_id, p_cancel_at_period_end
    )
    on conflict (polar_subscription_id) do update set
      plan = excluded.plan,
      status = 'active',
      current_period_end = excluded.current_period_end,
      polar_product_id = excluded.polar_product_id,
      cancel_at_period_end = excluded.cancel_at_period_end;

    update public.tenants
    set polar_customer_id = p_customer_id,
        plan = p_plan,
        next_plan = p_plan,
        status = 'active'
    where id = v_tenant_id;
  elsif p_event_type = 'subscription.canceled' or p_subscription_status = 'canceled' then
    update public.subscriptions
    set current_period_end = p_period_end,
        cancel_at_period_end = true
    where polar_subscription_id = p_subscription_id;
  elsif p_event_type = 'subscription.revoked'
     or p_subscription_status in ('unpaid', 'incomplete_expired') then
    update public.subscriptions
    set status = 'canceled',
        current_period_end = p_period_end,
        cancel_at_period_end = true
    where polar_subscription_id = p_subscription_id;

    if not exists (
      select 1 from public.subscriptions
      where tenant_id = v_tenant_id
        and status = 'active'
        and polar_subscription_id is distinct from p_subscription_id
        and (current_period_end is null or current_period_end > now())
    ) then
      update public.tenants set status = 'paused' where id = v_tenant_id;
    end if;
  end if;

  return true;
end;
$$;

revoke all on function public.process_polar_subscription_event(text,text,jsonb,uuid,text,text,text,public.tenant_plan,text,timestamptz,timestamptz,boolean) from public;
grant execute on function public.process_polar_subscription_event(text,text,jsonb,uuid,text,text,text,public.tenant_plan,text,timestamptz,timestamptz,boolean) to service_role;
