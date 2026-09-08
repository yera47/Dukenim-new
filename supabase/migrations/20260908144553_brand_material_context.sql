create table public.tenant_brand_materials (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  revision integer not null default 1 check(revision>0),
  notes text not null default '' check(length(notes)<=6000),
  logo_path text,
  colors jsonb not null default '[]' check(jsonb_typeof(colors)='array' and jsonb_array_length(colors)<=6),
  updated_at timestamptz not null default now()
);
alter table public.tenant_brand_materials enable row level security;
revoke all on public.tenant_brand_materials from anon;
grant select,insert,update on public.tenant_brand_materials to authenticated;
create policy brand_owner on public.tenant_brand_materials for all to authenticated
using(exists(select 1 from public.tenant_users where tenant_id=tenant_brand_materials.tenant_id and user_id=(select auth.uid()) and role='owner'))
with check(exists(select 1 from public.tenant_users where tenant_id=tenant_brand_materials.tenant_id and user_id=(select auth.uid()) and role='owner'));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('brand-materials','brand-materials',false,4194304,array['image/png']);
create policy brand_image_read on storage.objects for select to authenticated using(
  bucket_id='brand-materials' and exists(select 1 from public.tenant_users where tenant_id::text=(storage.foldername(name))[1] and user_id=(select auth.uid()) and role='owner')
);
create policy brand_image_insert on storage.objects for insert to authenticated with check(
  bucket_id='brand-materials' and exists(select 1 from public.tenant_users where tenant_id::text=(storage.foldername(name))[1] and user_id=(select auth.uid()) and role='owner')
);
