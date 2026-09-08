create function public.create_catalog_from_ai_design(p_tenant_id uuid,p_name text,p_generation_id uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare proposal jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.tenant_users where tenant_id=p_tenant_id and user_id=auth.uid() and role='owner') then raise exception 'Owner required'; end if;
 select output into proposal from public.ai_studio_generations where id=p_generation_id and tenant_id=p_tenant_id and intent='store_design';
 if not found then raise exception 'Design unavailable'; end if;
 if (jsonb_typeof(proposal)='object'
   and length(proposal->>'heroTitle') between 2 and 90
   and length(proposal->>'heroSubtitle') between 2 and 180
   and length(proposal->>'heroCtaLabel') between 2 and 36) is not true then raise exception 'Invalid design'; end if;
 -- This function checks membership, locks the tenant, validates entitlement/theme/color
 -- and rejects a second creation. Everything below is in the same transaction.
 perform public.create_catalog_atomic(p_tenant_id,p_name,proposal->>'templateKey',proposal->>'paletteKey',proposal->>'brandColor');
 update public.tenant_storefront_settings
 set hero_title=proposal->>'heroTitle',hero_subtitle=proposal->>'heroSubtitle',hero_cta_label=proposal->>'heroCtaLabel',updated_at=now()
 where tenant_id=p_tenant_id;
 if not found then raise exception 'Design not saved'; end if;
 return p_tenant_id;
end $$;
revoke all on function public.create_catalog_from_ai_design(uuid,text,uuid) from public,anon;
grant execute on function public.create_catalog_from_ai_design(uuid,text,uuid) to authenticated;
