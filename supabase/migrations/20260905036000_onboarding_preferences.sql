-- Persist the plan period selected during registration and complete onboarding atomically.
alter table public.tenants
  add column if not exists preferred_billing_period text not null default 'monthly';

alter table public.tenants drop constraint if exists tenants_preferred_billing_period_check;
alter table public.tenants add constraint tenants_preferred_billing_period_check
  check (preferred_billing_period in ('monthly', 'annual'));

create or replace function public.complete_onboarding_v2(
  p_tenant_id uuid,
  p_next_plan public.tenant_plan,
  p_business_vertical text,
  p_storefront_format text,
  p_preferred_billing_period text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_tenant_id is null or not (
    p_tenant_id in (select public.user_tenant_ids()) or public.is_superadmin()
  ) then
    raise exception 'Forbidden';
  end if;
  if p_next_plan not in ('basic'::public.tenant_plan, 'standard'::public.tenant_plan) then
    raise exception 'Invalid plan';
  end if;
  if p_business_vertical not in ('fashion','beauty','food','flowers','services','home','other') then
    raise exception 'Invalid business vertical';
  end if;
  if p_storefront_format not in ('catalog','one_page') then
    raise exception 'Invalid storefront format';
  end if;
  if p_preferred_billing_period not in ('monthly','annual') then
    raise exception 'Invalid billing period';
  end if;

  update public.tenants
  set next_plan = p_next_plan,
      business_vertical = p_business_vertical,
      storefront_format = p_storefront_format,
      preferred_billing_period = p_preferred_billing_period,
      onboarding_completed = true
  where id = p_tenant_id;

  if not found then raise exception 'Tenant not found'; end if;
end;
$$;

revoke all on function public.complete_onboarding_v2(uuid, public.tenant_plan, text, text, text) from public;
revoke all on function public.complete_onboarding_v2(uuid, public.tenant_plan, text, text, text) from anon;
grant execute on function public.complete_onboarding_v2(uuid, public.tenant_plan, text, text, text) to authenticated;
