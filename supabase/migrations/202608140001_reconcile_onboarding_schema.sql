-- Align the deployed database with the public signup and onboarding flow.
-- Existing tenants predate the onboarding flag, so keep their current access intact.
alter table public.tenants
  add column if not exists trial_ends_at timestamptz,
  add column if not exists next_plan public.tenant_plan,
  add column if not exists onboarding_completed boolean;

update public.tenants
set next_plan = coalesce(next_plan, plan),
    onboarding_completed = coalesce(onboarding_completed, true)
where next_plan is null or onboarding_completed is null;

alter table public.tenants
  alter column onboarding_completed set default false,
  alter column onboarding_completed set not null;

create or replace function public.complete_onboarding(
  p_tenant_id uuid,
  p_next_plan public.tenant_plan
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_tenant_id not in (select public.user_tenant_ids())
    and not public.is_superadmin() then
    raise exception 'Forbidden';
  end if;

  update public.tenants
  set next_plan = p_next_plan,
      onboarding_completed = true
  where id = p_tenant_id;

  if not found then
    raise exception 'Tenant not found';
  end if;
end;
$$;

-- Trigger functions must not be callable through the public API.
revoke execute on function public.apply_stock_movement() from public;
revoke execute on function public.assign_order_number() from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.is_superadmin() from public;
revoke execute on function public.user_tenant_ids() from public;

grant execute on function public.complete_onboarding(uuid, public.tenant_plan) to authenticated;
grant execute on function public.is_superadmin() to authenticated;
grant execute on function public.user_tenant_ids() to authenticated;
