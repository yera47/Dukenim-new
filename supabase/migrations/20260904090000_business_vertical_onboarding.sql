-- Persists the business context chosen during first-run onboarding.
alter table public.tenants
  add column if not exists business_vertical text
    check (business_vertical is null or business_vertical in ('fashion','beauty','food','flowers','services','home','other')),
  add column if not exists storefront_format text not null default 'catalog'
    check (storefront_format in ('catalog','one_page'));

alter table public.ai_studio_generations drop constraint if exists ai_studio_generations_intent_check;
alter table public.ai_studio_generations add constraint ai_studio_generations_intent_check
  check (intent in ('hero','promotion','catalog_copy','catalog_structure'));
