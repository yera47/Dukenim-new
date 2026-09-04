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
set search_path = public
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
    p.id,
    'order_created',
    'Новый заказ',
    coalesce(c.name, 'Покупатель') || ' оформил заказ',
    jsonb_build_object('orderId', new.id, 'tenantId', new.tenant_id)
  from public.tenant_users tu
  left join public.customers c on c.id = new.customer_id
  where tu.tenant_id = new.tenant_id;

  return new;
end;
$$;

revoke all on function public.queue_mobile_order_notification() from public, anon, authenticated;

drop trigger if exists queue_mobile_order_notification_on_order on public.orders;
create trigger queue_mobile_order_notification_on_order
  after insert on public.orders
  for each row
  execute function public.queue_mobile_order_notification();
