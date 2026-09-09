create or replace function public.create_catalog_with_theme(
 p_tenant_id uuid,p_name text,p_template text,p_palette text,p_generation_id uuid,p_color_theme jsonb
) returns uuid language plpgsql security invoker set search_path='' as $$
declare proposal jsonb;section jsonb;position integer:=0;
begin
 if auth.uid() is null or not exists(select 1 from public.tenant_users where tenant_id=p_tenant_id and user_id=auth.uid() and role='owner') then raise exception 'Owner required';end if;
 if p_generation_id is not null then
  select output into proposal from public.ai_studio_generations where id=p_generation_id and tenant_id=p_tenant_id and intent='store_design';
  if not found then raise exception 'Design unavailable';end if;
  if (jsonb_typeof(proposal)='object' and length(proposal->>'heroTitle') between 2 and 90 and length(proposal->>'heroSubtitle') between 2 and 180 and length(proposal->>'heroCtaLabel') between 2 and 36) is not true then raise exception 'Invalid design';end if;
  if proposal ? 'sections' then
   if jsonb_typeof(proposal->'sections') is distinct from 'array' then raise exception 'Invalid sections';end if;
   if jsonb_array_length(proposal->'sections') not between 2 and 6 then raise exception 'Invalid section count';end if;
   for section in select value from jsonb_array_elements(proposal->'sections') loop
    if (jsonb_typeof(section)='object' and length(trim(section->>'name')) between 2 and 40) is not true then raise exception 'Invalid section name';end if;
   end loop;
  end if;
 end if;
 -- The owner may choose another permitted composition without losing AI copy/sections.
 perform public.create_catalog_atomic(p_tenant_id,p_name,p_template,p_palette,null);
 update public.tenant_storefront_settings set color_theme=p_color_theme,
 hero_title=coalesce(proposal->>'heroTitle',hero_title),hero_subtitle=coalesce(proposal->>'heroSubtitle',hero_subtitle),hero_cta_label=coalesce(proposal->>'heroCtaLabel',hero_cta_label),updated_at=clock_timestamp()
 where tenant_id=p_tenant_id;
 if not found then raise exception 'Theme not saved';end if;
 if proposal ? 'sections' then
  for section in select value from jsonb_array_elements(proposal->'sections') loop
   if not exists(select 1 from public.categories where tenant_id=p_tenant_id and lower(name)=lower(trim(section->>'name'))) then
    insert into public.categories(tenant_id,name,slug,sort_order,is_active) values(p_tenant_id,trim(section->>'name'),'section-'||gen_random_uuid()::text,position,true);
   end if;
   position:=position+1;
  end loop;
 end if;
 return p_tenant_id;
end $$;
