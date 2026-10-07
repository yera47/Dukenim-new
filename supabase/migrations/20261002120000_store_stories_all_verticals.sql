-- Generalize the existing story table without moving or rewriting tenant data.
-- The legacy table/bucket names remain stable so existing media URLs keep working.
create or replace function public.check_food_story_product()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.product_id is not null and not exists (
    select 1
    from public.products p
    where p.id = new.product_id
      and p.tenant_id = new.tenant_id
  ) then
    raise exception 'Story product must belong to the same store';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

comment on table public.food_stories is
  'Tenant-scoped storefront stories for every business vertical; legacy name retained for compatibility.';
