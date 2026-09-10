-- Separate from tenant_users: that legacy membership grants broad owner access.
create table public.staff_access (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 80),
  permissions jsonb not null,
  active boolean not null default true,
  notify_orders boolean not null default false,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  unique(tenant_id,user_id),
  constraint staff_permission_shape check (
    jsonb_typeof(permissions)='object'
    and permissions ?& array['orders','catalog','stock','customers','analytics','studio']
    and permissions - array['orders','catalog','stock','customers','analytics','studio'] = '{}'::jsonb
    and permissions->>'orders' in ('none','read','write')
    and permissions->>'catalog' in ('none','read','write')
    and permissions->>'stock' in ('none','read','write')
    and permissions->>'customers' in ('none','read','write')
    and permissions->>'analytics' in ('none','read')
    and permissions->>'studio' in ('none','read','write')
    and not jsonb_path_exists(permissions, '$.* ? (@ == null)')
  )
);
alter table public.staff_access enable row level security;
revoke all on public.staff_access from anon, authenticated;
grant select on public.staff_access to authenticated;
grant all on public.staff_access to service_role;
create policy staff_access_read on public.staff_access for select to authenticated using (
  user_id=(select auth.uid()) or exists (
    select 1 from public.tenant_users tu where tu.tenant_id=staff_access.tenant_id
    and tu.user_id=(select auth.uid()) and tu.role='owner'
  )
);
-- No client mutation grant. Owner-authorized, audited mutation/invite API is
-- required before this table can grant operational access. No users are added.
