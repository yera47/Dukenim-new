create table public.mobile_device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null check (char_length(token) between 20 and 4096),
  platform text not null check (platform in ('ios', 'android')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create index mobile_device_tokens_user_enabled_idx
  on public.mobile_device_tokens (user_id)
  where enabled;

alter table public.mobile_device_tokens enable row level security;
revoke all on table public.mobile_device_tokens from anon, authenticated;
grant select, insert, update, delete on table public.mobile_device_tokens to authenticated;

create policy "Users read their own device tokens"
  on public.mobile_device_tokens for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users register their own device tokens"
  on public.mobile_device_tokens for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own device tokens"
  on public.mobile_device_tokens for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users remove their own device tokens"
  on public.mobile_device_tokens for delete to authenticated
  using ((select auth.uid()) = user_id);
