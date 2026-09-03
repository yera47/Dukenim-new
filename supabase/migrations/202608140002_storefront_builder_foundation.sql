-- Product foundation: constrained templates, safe themes, campaigns, domains and aggregate analytics.
-- Dukenim attribution is intentionally not a tenant-controlled setting.

alter table public.tenants
  add column if not exists domain_status text not null default 'not_configured'
    check (domain_status in ('not_configured','pending_verification','verified','error')),
  add column if not exists domain_verification_token uuid,
  add column if not exists domain_verified_at timestamptz;

create table if not exists public.storefront_templates (
  key text primary key check (key ~ '^[a-z0-9-]+$'), name text not null, description text not null,
  min_plan public.tenant_plan not null default 'basic', preview_image_url text,
  is_active boolean not null default true, sort_order integer not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.tenant_storefront_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  template_key text not null default 'atelier' references public.storefront_templates(key), palette_key text not null default 'ink-brass', brand_color text,
  hero_title text, hero_subtitle text, hero_image_url text, hero_cta_label text not null default 'Смотреть каталог', updated_at timestamptz not null default now()
);
create table if not exists public.storefront_campaigns (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 90), eyebrow text, body text, cta_label text not null default 'Смотреть', cta_href text not null default '#catalog', image_url text,
  starts_at timestamptz, ends_at timestamptz, status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create table if not exists public.storefront_daily_metrics (
  tenant_id uuid not null references public.tenants(id) on delete cascade, day date not null default current_date,
  page_views integer not null default 0 check (page_views >= 0), product_views integer not null default 0 check (product_views >= 0), add_to_cart integer not null default 0 check (add_to_cart >= 0), checkout_started integer not null default 0 check (checkout_started >= 0), orders_created integer not null default 0 check (orders_created >= 0), primary key (tenant_id, day)
);
create index if not exists storefront_campaigns_tenant_status_idx on public.storefront_campaigns(tenant_id, status, starts_at, ends_at);
create index if not exists storefront_daily_metrics_tenant_day_idx on public.storefront_daily_metrics(tenant_id, day desc);
alter table public.storefront_templates enable row level security;
alter table public.tenant_storefront_settings enable row level security;
alter table public.storefront_campaigns enable row level security;
alter table public.storefront_daily_metrics enable row level security;
create policy storefront_templates_public_read on public.storefront_templates for select using (is_active or public.is_superadmin());
create policy storefront_templates_root_write on public.storefront_templates for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());
create policy storefront_settings_public_read on public.tenant_storefront_settings for select using (exists(select 1 from public.tenants t where t.id = tenant_id and t.status in ('active','trial')) or tenant_id in (select public.user_tenant_ids()) or public.is_superadmin());
create policy storefront_settings_tenant_write on public.tenant_storefront_settings for all to authenticated using (tenant_id in (select public.user_tenant_ids()) or public.is_superadmin()) with check (tenant_id in (select public.user_tenant_ids()) or public.is_superadmin());
create policy storefront_campaigns_public_read on public.storefront_campaigns for select using (status = 'published' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()) and exists(select 1 from public.tenants t where t.id = tenant_id and t.status in ('active','trial')));
create policy storefront_campaigns_tenant_all on public.storefront_campaigns for all to authenticated using (tenant_id in (select public.user_tenant_ids()) or public.is_superadmin()) with check (tenant_id in (select public.user_tenant_ids()) or public.is_superadmin());
create policy storefront_daily_metrics_root_read on public.storefront_daily_metrics for select to authenticated using (public.is_superadmin());
insert into public.storefront_templates(key,name,description,min_plan,sort_order) values
  ('atelier','Ателье','Спокойная редакционная витрина для одежды, декора и авторских товаров.','basic',10),
  ('studio','Студия','Чистый каталог с упором на карточки товаров и быстрый заказ.','basic',20),
  ('market','Маркет','Практичная витрина для ассортимента, категорий и повторных покупок.','basic',30),
  ('journal','Журнал','История бренда, подборки и коллекции с мягкой визуальной подачей.','standard',40),
  ('gallery','Галерея','Премиальная подача коллекций с акциями и бренд-блоками.','standard',50),
  ('signature','Сигнатура','Гибкая фирменная витрина для собственного домена и кампаний.','standard',60)
on conflict (key) do update set name=excluded.name,description=excluded.description,min_plan=excluded.min_plan,sort_order=excluded.sort_order;
insert into public.tenant_storefront_settings(tenant_id) select id from public.tenants on conflict (tenant_id) do nothing;
