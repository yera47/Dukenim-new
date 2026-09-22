create policy brand_image_owner_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'brand-materials'
  and exists (
    select 1
    from public.tenant_users
    where tenant_id::text = (storage.foldername(name))[1]
      and user_id = (select auth.uid())
      and role = 'owner'
  )
);
