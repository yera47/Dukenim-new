-- New mobile stores begin at the shared onboarding stage instead of skipping it.
-- The caller is derived exclusively from auth.uid(); no user or owner id is accepted.
create or replace function public.create_mobile_owner_store(
  p_name text,
  p_vertical text default 'other',
  p_format text default 'catalog'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_tenant uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_base text;
  v_slug text;
  v_attempt integer := 0;
begin
  if v_user is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if not exists(select 1 from auth.users where id=v_user and email_confirmed_at is not null) then
    raise exception 'Confirm email first' using errcode = '42501';
  end if;
  if length(v_name) not between 2 and 80 or v_name ~ '[[:cntrl:]]' then raise exception 'Invalid store name'; end if;
  if p_vertical not in ('fashion','beauty','food','flowers','services','home','other') then raise exception 'Invalid business vertical'; end if;
  if p_format not in ('catalog','one_page') then raise exception 'Invalid storefront format'; end if;
  if (select count(*) from public.tenant_users where user_id=v_user and role='owner') >= 5 then
    raise exception 'Store limit reached' using errcode = '54000';
  end if;

  v_base := regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  if length(v_base) < 2 then v_base := 'store'; end if;
  v_base := left(v_base, 32);
  loop
    v_attempt := v_attempt + 1;
    v_slug := v_base || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8);
    exit when not exists(select 1 from public.tenants where slug=v_slug);
    if v_attempt >= 5 then raise exception 'Unable to allocate store address'; end if;
  end loop;

  insert into public.tenants(
    slug,name,phone,accent_color,plan,next_plan,status,trial_ends_at,onboarding_completed,
    business_vertical,storefront_format,catalog_published
  ) values(
    v_slug,v_name,'','#315F78','basic','basic','trial',now()+interval '7 days',false,
    p_vertical,p_format,false
  ) returning id into v_tenant;
  insert into public.profiles(user_id,role) values(v_user,'owner')
    on conflict(user_id) do update set role=case when public.profiles.role='superadmin' then public.profiles.role else 'owner'::public.profile_role end;
  insert into public.tenant_users(tenant_id,user_id,role) values(v_tenant,v_user,'owner');
  insert into public.tenant_settings(tenant_id,delivery_enabled,pickup_enabled,payment_online,payment_provider,min_order)
    values(v_tenant,false,true,false,'none',0);
  insert into public.tenant_storefront_settings(tenant_id,template_key,palette_key,brand_color)
    values(v_tenant,'studio','ink-brass','#315F78')
    on conflict(tenant_id) do nothing;
  insert into public.platform_audit_events(actor_id,tenant_id,action,metadata)
    values(v_user,v_tenant,'mobile.store.created',jsonb_build_object('slug',v_slug,'vertical',p_vertical));
  return v_tenant;
end
$$;

revoke all on function public.create_mobile_owner_store(text,text,text) from public,anon;
grant execute on function public.create_mobile_owner_store(text,text,text) to authenticated;

