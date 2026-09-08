-- Run through a privileged SQL connection; no persistent mutations or personal data output.
begin;
do $$
declare actor uuid;
begin
  select user_id into actor from public.profiles where role = 'owner' limit 1;
  if actor is null then raise exception 'No owner fixture available'; end if;
  perform set_config('request.jwt.claim.sub', actor::text, true);
end $$;
set local role authenticated;
do $$
begin
  if public.is_superadmin() then raise exception 'Owner elevated'; end if;
  if exists (select 1 from public.profiles where role = 'superadmin') then
    raise exception 'Root profile visible to owner';
  end if;
  begin
    update public.profiles set role = 'superadmin' where user_id = auth.uid();
    raise exception 'Profile update not blocked';
  exception when insufficient_privilege then null;
  end;
  if public.is_superadmin() then raise exception 'Owner elevated after mutation'; end if;
end $$;
rollback;
