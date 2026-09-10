-- Allow the private Business.Ru account connector to share the existing
-- server-only encrypted connection store. Browser roles still have no access.
alter table public.integration_connections
  drop constraint integration_connections_provider_check;

alter table public.integration_connections
  add constraint integration_connections_provider_check
  check (provider in ('planfix', 'biznes_ru'));

comment on table public.integration_connections is
  'Server-only encrypted provider connections; never expose token_ciphertext through owner/root queries.';
