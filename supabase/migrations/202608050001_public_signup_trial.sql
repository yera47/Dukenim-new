alter table public.tenants
  add column if not exists trial_ends_at timestamptz,
  add column if not exists next_plan public.plan_type,
  add column if not exists onboarding_completed boolean not null default false;

update public.tenants
set trial_ends_at = coalesce(trial_ends_at, created_at + interval '7 days'),
    next_plan = coalesce(next_plan, plan)
where status = 'trial';

create or replace function public.complete_onboarding(p_tenant_id uuid,p_next_plan public.plan_type)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if p_tenant_id not in(select public.user_tenant_ids()) and not public.is_superadmin() then raise exception 'Forbidden'; end if;
  update public.tenants set next_plan=p_next_plan,onboarding_completed=true where id=p_tenant_id;
end;$$;
grant execute on function public.complete_onboarding(uuid,public.plan_type) to authenticated;
