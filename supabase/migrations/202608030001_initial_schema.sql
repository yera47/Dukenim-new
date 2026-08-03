create extension if not exists pgcrypto;

create type public.profile_role as enum ('customer','owner','superadmin');
create type public.tenant_role as enum ('owner','admin','staff');
create type public.plan_type as enum ('basic','standard','pro');
create type public.tenant_status as enum ('active','paused','trial');
create type public.order_source as enum ('online','offline');
create type public.order_status as enum ('new','confirmed','assembled','delivering','done','cancelled');
create type public.payment_status as enum ('pending','paid','failed','refunded');
create type public.stock_reason as enum ('sale','return','restock','correction','writeoff');
create type public.subscription_status as enum ('active','canceled');
create type public.request_status as enum ('new','in_progress','done');
create type public.message_role as enum ('owner','superadmin');

create table public.tenants (
  id uuid primary key default gen_random_uuid(), slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  custom_domain text unique, name text not null, tagline text, logo_url text, accent_color text not null default '#0E5C4A',
  city text, phone text, whatsapp text, instagram text, plan public.plan_type not null default 'basic',
  status public.tenant_status not null default 'trial', created_at timestamptz not null default now()
);
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.profile_role not null default 'customer', created_at timestamptz not null default now()
);
create table public.tenant_users (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role public.tenant_role not null default 'staff', unique(tenant_id,user_id)
);
create table public.categories (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null, slug text not null, sort_order integer not null default 0, is_active boolean not null default true, unique(tenant_id,slug)
);
create table public.products (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null, title text not null, description text,
  price integer not null check(price >= 0), old_price integer check(old_price is null or old_price >= price), images text[] not null default '{}',
  is_active boolean not null default true, is_featured boolean not null default false, sort_order integer not null default 0, created_at timestamptz not null default now()
);
create table public.product_variants (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade, size text, color text, sku text,
  stock_qty integer not null default 0 check(stock_qty >= 0), is_active boolean not null default true, unique(tenant_id,sku)
);
create table public.customers (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  phone text not null, name text, first_order timestamptz, last_order timestamptz, orders_count integer not null default 0,
  total_spent integer not null default 0 check(total_spent >= 0), unique(tenant_id,phone)
);
create table public.orders (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null, order_number bigint,
  source public.order_source not null default 'online', status public.order_status not null default 'new', delivery_method text,
  delivery_address text, delivery_cost integer not null default 0 check(delivery_cost >= 0), subtotal integer not null check(subtotal >= 0),
  total integer not null check(total >= 0), payment_method text, payment_status public.payment_status not null default 'pending',
  staff_id uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), unique(tenant_id,order_number)
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade, variant_id uuid references public.product_variants(id) on delete set null,
  title_snapshot text not null, price_snapshot integer not null check(price_snapshot >= 0), qty integer not null check(qty > 0)
);
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete restrict, delta integer not null check(delta <> 0),
  reason public.stock_reason not null, order_id uuid references public.orders(id) on delete set null,
  staff_id uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null, cost integer not null default 0 check(cost >= 0), free_from integer check(free_from >= 0), eta_text text, is_active boolean not null default true
);
create table public.tenant_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade, delivery_enabled boolean not null default true,
  pickup_enabled boolean not null default true, payment_online boolean not null default false, payment_provider text,
  merchant_id text, merchant_key text, min_order integer not null default 0 check(min_order >= 0)
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan public.plan_type not null, status public.subscription_status not null default 'active', started_at timestamptz not null default now(), current_period_end timestamptz
);
create table public.change_requests (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  text text not null, status public.request_status not null default 'new', created_at timestamptz not null default now()
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  from_role public.message_role not null, text text not null, created_at timestamptz not null default now()
);

create index on public.tenant_users(user_id); create index on public.products(tenant_id,is_active);
create index on public.product_variants(tenant_id,product_id); create index on public.orders(tenant_id,created_at desc);
create index on public.stock_movements(tenant_id,variant_id); create index on public.messages(tenant_id,created_at);

create function public.is_superadmin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'superadmin');
$$;
create function public.user_tenant_ids() returns setof uuid language sql stable security definer set search_path = '' as $$
  select tenant_id from public.tenant_users where user_id = auth.uid();
$$;
revoke all on function public.is_superadmin() from public; revoke all on function public.user_tenant_ids() from public;
grant execute on function public.is_superadmin() to authenticated; grant execute on function public.user_tenant_ids() to authenticated;

create function public.assign_order_number() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.tenant_id::text, 0));
  select coalesce(max(order_number),0)+1 into new.order_number from public.orders where tenant_id=new.tenant_id;
  return new;
end; $$;
create trigger orders_assign_number before insert on public.orders for each row when (new.order_number is null) execute function public.assign_order_number();

create function public.apply_stock_movement() returns trigger language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  update public.product_variants set stock_qty=stock_qty+new.delta
  where id=new.variant_id and tenant_id=new.tenant_id and stock_qty+new.delta>=0;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Insufficient stock or tenant mismatch'; end if;
  return new;
end; $$;
create trigger stock_movement_apply after insert on public.stock_movements for each row execute function public.apply_stock_movement();

create function public.block_direct_stock_update() returns trigger language plpgsql as $$
begin if new.stock_qty <> old.stock_qty and pg_trigger_depth() < 2 then raise exception 'Stock may only change through stock_movements'; end if; return new; end; $$;
create trigger variants_block_stock before update of stock_qty on public.product_variants for each row execute function public.block_direct_stock_update();

alter table public.tenants enable row level security; alter table public.profiles enable row level security;
alter table public.tenant_users enable row level security; alter table public.categories enable row level security;
alter table public.products enable row level security; alter table public.product_variants enable row level security;
alter table public.customers enable row level security; alter table public.orders enable row level security;
alter table public.order_items enable row level security; alter table public.stock_movements enable row level security;
alter table public.delivery_zones enable row level security; alter table public.tenant_settings enable row level security;
alter table public.subscriptions enable row level security; alter table public.change_requests enable row level security;
alter table public.messages enable row level security;

create policy tenants_public_read on public.tenants for select using (status in ('active','trial') or id in (select public.user_tenant_ids()) or public.is_superadmin());
create policy tenants_admin_all on public.tenants for all to authenticated using (id in (select public.user_tenant_ids()) or public.is_superadmin()) with check (id in (select public.user_tenant_ids()) or public.is_superadmin());
create policy profiles_self_read on public.profiles for select to authenticated using (user_id=auth.uid() or public.is_superadmin());
create policy profiles_root_all on public.profiles for all to authenticated using (public.is_superadmin()) with check(public.is_superadmin());
create policy tenant_users_members on public.tenant_users for select to authenticated using (tenant_id in (select public.user_tenant_ids()) or public.is_superadmin());
create policy tenant_users_root_write on public.tenant_users for all to authenticated using(public.is_superadmin()) with check(public.is_superadmin());

create policy categories_public_read on public.categories for select using (is_active and exists(select 1 from public.tenants t where t.id=tenant_id and t.status in ('active','trial')));
create policy products_public_read on public.products for select using (is_active and exists(select 1 from public.tenants t where t.id=tenant_id and t.status in ('active','trial')));
create policy variants_public_read on public.product_variants for select using (is_active and exists(select 1 from public.tenants t where t.id=tenant_id and t.status in ('active','trial')));
create policy zones_public_read on public.delivery_zones for select using (is_active and exists(select 1 from public.tenants t where t.id=tenant_id and t.status in ('active','trial')));

do $$ declare tbl text; begin
  foreach tbl in array array['categories','products','product_variants','customers','orders','order_items','stock_movements','delivery_zones','subscriptions','change_requests','messages'] loop
    execute format('create policy %I on public.%I for all to authenticated using (tenant_id in (select public.user_tenant_ids()) or public.is_superadmin()) with check (tenant_id in (select public.user_tenant_ids()) or public.is_superadmin())', tbl||'_tenant_all', tbl);
  end loop;
end $$;
create policy settings_tenant_all on public.tenant_settings for all to authenticated using(tenant_id in (select public.user_tenant_ids()) or public.is_superadmin()) with check(tenant_id in (select public.user_tenant_ids()) or public.is_superadmin());

insert into storage.buckets(id,name,public) values('product-images','product-images',true) on conflict(id) do nothing;
create policy product_images_public_read on storage.objects for select using(bucket_id='product-images');
create policy product_images_tenant_write on storage.objects for all to authenticated
using(bucket_id='product-images' and ((storage.foldername(name))[1]::uuid in (select public.user_tenant_ids()) or public.is_superadmin()))
with check(bucket_id='product-images' and ((storage.foldername(name))[1]::uuid in (select public.user_tenant_ids()) or public.is_superadmin()));
