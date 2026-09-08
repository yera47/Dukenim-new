create table public.mobile_device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null check (char_length(token) between 20 and 4096),
  platform text not null check (platform in ('ios', 'android')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create index mobile_device_tokens_user_enabled_idx
  on public.mobile_device_tokens (user_id)
  where enabled;

alter table public.mobile_device_tokens enable row level security;
revoke all on table public.mobile_device_tokens from anon, authenticated;
grant select, insert, update, delete on table public.mobile_device_tokens to authenticated;

create policy "Users read their own device tokens"
  on public.mobile_device_tokens for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users register their own device tokens"
  on public.mobile_device_tokens for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own device tokens"
  on public.mobile_device_tokens for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users remove their own device tokens"
  on public.mobile_device_tokens for delete to authenticated
  using ((select auth.uid()) = user_id);


-- Queue native order notifications server-side. Device tokens remain user-owned;
-- this table is intentionally not readable from the client except for the user's
-- own rows, and delivery is performed only through a protected server route.
create table if not exists public.mobile_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('order_created')),
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 3),
  deliver_after timestamptz not null default now(),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mobile_notification_outbox_pending_idx
  on public.mobile_notification_outbox (status, deliver_after, created_at)
  where status = 'pending';

create index if not exists mobile_notification_outbox_user_idx
  on public.mobile_notification_outbox (user_id, created_at desc);

alter table public.mobile_notification_outbox enable row level security;

revoke all on table public.mobile_notification_outbox from anon, authenticated;
grant select on table public.mobile_notification_outbox to authenticated;

create policy "Users can view their own mobile notification history"
  on public.mobile_notification_outbox
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Guest checkout can create an order through the existing secured RPC, so this
-- trigger must bypass RLS solely to create internal delivery work. It is not a
-- public RPC: execute is revoked after creation and the function uses a fixed
-- search path.
create or replace function public.queue_mobile_order_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.mobile_notification_outbox (
    tenant_id,
    user_id,
    kind,
    title,
    body,
    data
  )
  select
    new.tenant_id,
    tu.user_id,
    'order_created',
    case when new.delivery_method::text='pickup' then 'Самовывоз' else 'Новый заказ' end,
    'Заказ №' || coalesce(new.order_number::text,'—') || case when new.payment_status::text='paid' then ' · оплачен' else ' · ожидает оплаты' end,
    jsonb_build_object('orderId', new.id, 'tenantId', new.tenant_id, 'method', new.delivery_method, 'paymentStatus', new.payment_status)
  from public.tenant_users tu
  where tu.tenant_id = new.tenant_id and tu.role='owner' and new.source::text='online';

  return new;
end;
$$;

revoke all on function public.queue_mobile_order_notification() from public, anon, authenticated;

drop trigger if exists queue_mobile_order_notification_on_order on public.orders;
create trigger queue_mobile_order_notification_on_order
  after insert on public.orders
  for each row
  execute function public.queue_mobile_order_notification();


grant all on public.mobile_device_tokens, public.mobile_notification_outbox to service_role;
