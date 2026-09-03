-- Audit finding: 202608140001_reconcile_onboarding_schema.sql, 202608140002_storefront_builder_foundation.sql
-- and 202608170001_restore_commerce_operations.sql reference public.tenant_plan, public.delivery_method and
-- public.payment_method, but no migration in this repository ever creates those types. The initial schema
-- only created public.plan_type. Production evidently has these types (AI_HANDOFF records those RPCs as
-- restored and verified live), so they were most likely created ad-hoc outside migration history. Replaying
-- supabase/migrations/ on a fresh database fails without them. This migration is purely additive and
-- idempotent: it only creates a type when it does not already exist, so it is safe to run against the
-- existing production database (no-op there) and against a fresh database (fixes replay).
--
-- Owner action required before trusting this further: confirm in the Supabase SQL editor which exact
-- definition of create_storefront_order / create_offline_sale / activate_subscription is live in production
-- (202608040001+202608040002 vs 202608170001) and which values these three types actually hold there, so a
-- future migration can be written to match reality instead of the assumption encoded below.

do $$ begin
  if not exists (select 1 from pg_type where typname = 'tenant_plan' and typnamespace = 'public'::regnamespace) then
    create type public.tenant_plan as enum ('basic', 'standard', 'pro');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'delivery_method' and typnamespace = 'public'::regnamespace) then
    create type public.delivery_method as enum ('pickup', 'courier');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'payment_method' and typnamespace = 'public'::regnamespace) then
    create type public.payment_method as enum ('cash', 'kaspi', 'card', 'online');
  end if;
end $$;
