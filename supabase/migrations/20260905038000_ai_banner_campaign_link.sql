-- Link an AI banner to one editable campaign draft and make repeated saves idempotent.
alter table public.storefront_campaigns
  add column if not exists ai_generation_id uuid
    references public.ai_studio_generations(id) on delete set null;

create unique index if not exists storefront_campaigns_ai_generation_unique_idx
  on public.storefront_campaigns (ai_generation_id)
  where ai_generation_id is not null;
