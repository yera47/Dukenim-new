-- Read-only, tenant-scoped trial clock for native clients. The deadline remains
-- tenants.trial_ends_at; server_now prevents a device clock from extending/resetting it.
create or replace function public.get_trial_clock(p_tenant_id uuid)
returns table (
  status public.tenant_status,
  trial_ends_at timestamptz,
  server_now timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select t.status, t.trial_ends_at, now()
  from public.tenants t
  where t.id = p_tenant_id
    and (
      t.id in (select public.user_tenant_ids())
      or public.is_superadmin()
    );
$$;

revoke all on function public.get_trial_clock(uuid) from public, anon;
grant execute on function public.get_trial_clock(uuid) to authenticated;
