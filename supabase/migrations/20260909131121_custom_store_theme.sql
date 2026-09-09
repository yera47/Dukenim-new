alter table public.tenant_storefront_settings add column color_theme jsonb;
alter table public.tenant_storefront_settings add constraint color_theme_valid check (
 color_theme is null or (
  jsonb_typeof(color_theme)='object' and color_theme ?& array['background','surface','accent']
  and (color_theme - array['background','surface','accent'])='{}'::jsonb
  and color_theme->>'background' ~ '^#[0-9A-Fa-f]{6}$'
  and color_theme->>'surface' ~ '^#[0-9A-Fa-f]{6}$'
  and color_theme->>'accent' ~ '^#[0-9A-Fa-f]{6}$'
 ) is true
);

-- An owner's selected shades and catalog are committed together, never in two requests.
create function public.create_catalog_with_theme(
 p_tenant_id uuid,p_name text,p_template text,p_palette text,p_generation_id uuid,p_color_theme jsonb
) returns uuid language plpgsql security invoker set search_path='' as $$
begin
 if p_generation_id is not null then
  perform public.create_catalog_from_ai_design(p_tenant_id,p_name,p_generation_id);
 else
  perform public.create_catalog_atomic(p_tenant_id,p_name,p_template,p_palette,null);
 end if;
 update public.tenant_storefront_settings set color_theme=p_color_theme,updated_at=clock_timestamp()
 where tenant_id=p_tenant_id;
 if not found then raise exception 'Theme not saved'; end if;
 return p_tenant_id;
end $$;
revoke all on function public.create_catalog_with_theme(uuid,text,text,text,uuid,jsonb) from public,anon;
grant execute on function public.create_catalog_with_theme(uuid,text,text,text,uuid,jsonb) to authenticated;

create or replace function public.undo_storefront_design(p_tenant_id uuid,p_history_id uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare v_current public.tenant_storefront_settings%rowtype;
 v_history public.storefront_design_history%rowtype; v_tenant public.tenants%rowtype; v_plan text;
begin
 if auth.uid() is null or not exists(select 1 from public.tenant_users where tenant_id=p_tenant_id and user_id=auth.uid() and role='owner') then raise exception 'Owner required'; end if;
 select * into v_tenant from public.tenants where id=p_tenant_id;
 if (v_tenant.status='active' or (v_tenant.status='trial' and v_tenant.trial_ends_at>now())) is not true then raise exception 'Entitlement inactive'; end if;
 v_plan:=case when v_tenant.status='trial' then coalesce(v_tenant.next_plan,v_tenant.plan)::text else v_tenant.plan::text end;
 select * into v_current from public.tenant_storefront_settings where tenant_id=p_tenant_id for update;
 if not found then raise exception 'Settings missing'; end if;
 select * into v_history from public.storefront_design_history where tenant_id=p_tenant_id order by created_at desc,id desc limit 1;
 -- Pre-migration entries have no color_theme key; normalize only that absent column.
 if not found or v_history.id<>p_history_id or (jsonb_build_object('color_theme',null)||v_history.after_state) is distinct from (to_jsonb(v_current)-'updated_at') then raise exception 'Design conflict'; end if;
 if v_plan='basic' and ((v_history.before_state->>'template_key') not in ('atelier','market','studio') or v_history.before_state->>'brand_color' is not null) then raise exception 'Plan restriction'; end if;
 update public.tenant_storefront_settings set
 template_key=v_history.before_state->>'template_key',palette_key=v_history.before_state->>'palette_key',
 brand_color=v_history.before_state->>'brand_color',hero_title=v_history.before_state->>'hero_title',
 color_theme=nullif(v_history.before_state->'color_theme','null'::jsonb),
 hero_subtitle=v_history.before_state->>'hero_subtitle',hero_image_url=v_history.before_state->>'hero_image_url',
 hero_cta_label=v_history.before_state->>'hero_cta_label',updated_at=clock_timestamp()
 where tenant_id=p_tenant_id;
 return true;
end $$;
