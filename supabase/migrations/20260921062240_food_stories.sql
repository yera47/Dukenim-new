create table public.food_stories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  caption text check (caption is null or char_length(caption) <= 300),
  media_path text not null,
  media_type text not null check (media_type in ('image','video')),
  product_id uuid references public.products(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','published')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_story_tenant_path check (split_part(media_path, '/', 1) = tenant_id::text)
);
create index food_stories_tenant_order_idx on public.food_stories(tenant_id,status,sort_order,created_at);

create function public.check_food_story_product() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.product_id is not null and not exists (
    select 1 from public.products p where p.id = new.product_id and p.tenant_id = new.tenant_id
  ) then raise exception 'Story product must belong to the same store'; end if;
  if not exists (select 1 from public.tenants t where t.id = new.tenant_id and t.business_vertical = 'food') then
    raise exception 'Stories are available for food stores';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger food_story_product_guard before insert or update on public.food_stories
for each row execute function public.check_food_story_product();

alter table public.food_stories enable row level security;
create policy food_story_owner_read on public.food_stories for select to authenticated
using (exists (select 1 from public.tenant_users u where u.tenant_id = food_stories.tenant_id and u.user_id = (select auth.uid()) and u.role = 'owner'));
create policy food_story_owner_insert on public.food_stories for insert to authenticated
with check (exists (select 1 from public.tenant_users u where u.tenant_id = food_stories.tenant_id and u.user_id = (select auth.uid()) and u.role = 'owner'));
create policy food_story_owner_update on public.food_stories for update to authenticated
using (exists (select 1 from public.tenant_users u where u.tenant_id = food_stories.tenant_id and u.user_id = (select auth.uid()) and u.role = 'owner'))
with check (exists (select 1 from public.tenant_users u where u.tenant_id = food_stories.tenant_id and u.user_id = (select auth.uid()) and u.role = 'owner'));
create policy food_story_owner_delete on public.food_stories for delete to authenticated
using (exists (select 1 from public.tenant_users u where u.tenant_id = food_stories.tenant_id and u.user_id = (select auth.uid()) and u.role = 'owner'));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('food-stories','food-stories',true,20971520,array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict (id) do nothing;
create policy food_story_media_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'food-stories' and exists (
  select 1 from public.tenant_users u where u.tenant_id::text = (storage.foldername(name))[1]
  and u.user_id = (select auth.uid()) and u.role = 'owner'
));
create policy food_story_media_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'food-stories' and exists (
  select 1 from public.tenant_users u where u.tenant_id::text = (storage.foldername(name))[1]
  and u.user_id = (select auth.uid()) and u.role = 'owner'
));
