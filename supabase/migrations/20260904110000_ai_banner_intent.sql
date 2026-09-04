alter table public.ai_studio_generations drop constraint if exists ai_studio_generations_intent_check;
alter table public.ai_studio_generations add constraint ai_studio_generations_intent_check
  check (intent in ('hero','promotion','catalog_copy','catalog_structure','banner'));
