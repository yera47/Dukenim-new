create policy food_story_media_owner_read on storage.objects for select to authenticated
using (bucket_id = 'food-stories' and exists (
  select 1 from public.tenant_users u where u.tenant_id::text = (storage.foldername(name))[1]
  and u.user_id = (select auth.uid()) and u.role = 'owner'
));
