-- Production launch hardening: private subscription promotions, checkout requests,
-- root audit trail, safer RPC exposure and the indexes reported by Supabase advisors.

create table if not exists public.subscription_promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$'),
  title text not null check (char_length(title) between 2 and 120),
  description text,
  plan public.tenant_plan,
  discount_type text not null check (discount_type in ('percent', 'fixed_kzt', 'free_days')),
  discount_value integer not null check (discount_value > 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  per_tenant_limit integer not null default 1 check (per_tenant_limit between 1 and 10),
  new_tenants_only boolean not null default true,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check ((discount_type <> 'percent') or discount_value <= 100)
);

create table if not exists public.subscription_checkout_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan public.tenant_plan not null,
  billing_period text not null check (billing_period in ('monthly', 'annual')),
  base_amount integer not null check (base_amount >= 0),
  discount_amount integer not null default 0 check (discount_amount >= 0 and discount_amount <= base_amount),
  bonus_days integer not null default 0 check (bonus_days >= 0 and bonus_days <= 365),
  final_amount integer not null check (final_amount >= 0 and final_amount <= base_amount),
  promotion_id uuid references public.subscription_promotions(id) on delete set null,
  promotion_code text,
  status text not null default 'awaiting_payment_provider' check (status in ('awaiting_payment_provider', 'awaiting_payment', 'paid', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((promotion_id is null and promotion_code is null) or (promotion_id is not null and promotion_code is not null))
);

create table if not exists public.subscription_promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.subscription_promotions(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  checkout_request_id uuid references public.subscription_checkout_requests(id) on delete set null,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz not null default now(),
  unique (promotion_id, tenant_id)
);

create table if not exists public.platform_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  action text not null check (char_length(action) between 3 and 100),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists subscription_checkout_requests_tenant_created_idx on public.subscription_checkout_requests(tenant_id, created_at desc);
create index if not exists subscription_checkout_requests_status_idx on public.subscription_checkout_requests(status, created_at desc);
create index if not exists subscription_promo_redemptions_promotion_idx on public.subscription_promo_redemptions(promotion_id);
create index if not exists platform_audit_events_tenant_created_idx on public.platform_audit_events(tenant_id, created_at desc);
create index if not exists platform_audit_events_actor_created_idx on public.platform_audit_events(actor_id, created_at desc);
create index if not exists change_requests_tenant_idx on public.change_requests(tenant_id);
create index if not exists delivery_zones_tenant_idx on public.delivery_zones(tenant_id);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_tenant_idx on public.order_items(tenant_id);
create index if not exists order_items_variant_idx on public.order_items(variant_id);
create index if not exists orders_customer_idx on public.orders(customer_id);
create index if not exists orders_staff_idx on public.orders(staff_id);
create index if not exists product_variants_tenant_idx on public.product_variants(tenant_id);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists stock_movements_order_idx on public.stock_movements(order_id);
create index if not exists stock_movements_staff_idx on public.stock_movements(staff_id);
create index if not exists stock_movements_tenant_idx on public.stock_movements(tenant_id);
create index if not exists subscriptions_tenant_idx on public.subscriptions(tenant_id);
create index if not exists tenant_storefront_settings_template_idx on public.tenant_storefront_settings(template_key);
create index if not exists tenant_users_user_idx on public.tenant_users(user_id);

alter table public.subscription_promotions enable row level security;
alter table public.subscription_checkout_requests enable row level security;
alter table public.subscription_promo_redemptions enable row level security;
alter table public.platform_audit_events enable row level security;

drop policy if exists subscription_promotions_root_all on public.subscription_promotions;
create policy subscription_promotions_root_all on public.subscription_promotions
  for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists subscription_checkout_requests_root_all on public.subscription_checkout_requests;
create policy subscription_checkout_requests_root_all on public.subscription_checkout_requests
  for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists subscription_checkout_requests_tenant_read on public.subscription_checkout_requests;
create policy subscription_checkout_requests_tenant_read on public.subscription_checkout_requests
  for select to authenticated
  using (tenant_id in (select public.user_tenant_ids()));

drop policy if exists subscription_promo_redemptions_root_all on public.subscription_promo_redemptions;
create policy subscription_promo_redemptions_root_all on public.subscription_promo_redemptions
  for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists platform_audit_events_root_read on public.platform_audit_events;
create policy platform_audit_events_root_read on public.platform_audit_events
  for select to authenticated
  using (public.is_superadmin());

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_superadmin());
