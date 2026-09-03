-- Profiles contain only identity and platform role. Roles are server-managed;
-- an authenticated user must never be able to update their own profile row.
drop policy if exists profiles_self_update on public.profiles;
revoke update on table public.profiles from anon, authenticated;
