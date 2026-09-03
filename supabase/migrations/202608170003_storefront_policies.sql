-- Optional public information: blank values stay absent from the storefront.
alter table public.tenant_settings
  add column if not exists delivery_policy text,
  add column if not exists return_policy text;

alter table public.tenant_settings
  add constraint tenant_settings_delivery_policy_length check (delivery_policy is null or char_length(delivery_policy) <= 2000),
  add constraint tenant_settings_return_policy_length check (return_policy is null or char_length(return_policy) <= 2000);
