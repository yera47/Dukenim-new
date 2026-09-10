alter table public.tenant_storefront_settings add column layout_config jsonb;
alter table public.tenant_storefront_settings add constraint personal_layout_valid check (
 layout_config is null or (
 jsonb_typeof(layout_config)='object'
 and layout_config ?& array['typography','hero','density','columns','corners','imageRatio']
 and (layout_config-array['typography','hero','density','columns','corners','imageRatio'])='{}'::jsonb
 and layout_config->>'typography' in ('modern','editorial','technical')
 and layout_config->>'hero' in ('editorial','compact','centered')
 and layout_config->>'density' in ('airy','balanced','compact')
 and layout_config->'columns' in ('2'::jsonb,'3'::jsonb,'4'::jsonb)
 and layout_config->>'corners' in ('square','soft','rounded')
 and layout_config->>'imageRatio' in ('portrait','square','landscape')
 ) is true
);

-- Preserve existing authorization, locks, stock and fulfillment transaction semantics.
-- Abort rather than silently patching a function that has changed concurrently.
do $$
declare definition text; needle text;
begin
 definition:=pg_get_functiondef('public.create_catalog_with_theme(uuid,text,text,text,uuid,jsonb)'::regprocedure);
 needle:='set color_theme=p_color_theme,';
 if strpos(definition,needle)=0 then raise exception 'Catalog function changed; review migration';end if;
 execute replace(definition,needle,'set layout_config=coalesce(proposal->''layout'',layout_config),color_theme=p_color_theme,');

 definition:=pg_get_functiondef('public.staff_apply_design(uuid,uuid,timestamptz)'::regprocedure);
 needle:='set template_key=proposal->>''templateKey'',';
 if strpos(definition,needle)=0 then raise exception 'Staff function changed; review migration';end if;
 execute replace(definition,needle,'set layout_config=coalesce(proposal->''layout'',layout_config),template_key=proposal->>''templateKey'',');

 definition:=pg_get_functiondef('public.undo_storefront_design(uuid,uuid)'::regprocedure);
 needle:='jsonb_build_object(''color_theme'',null)';
 if strpos(definition,needle)=0 then raise exception 'Undo comparison changed; review migration';end if;
 definition:=replace(definition,needle,'jsonb_build_object(''color_theme'',null,''layout_config'',null)');
 needle:='color_theme=nullif(v_history.before_state->''color_theme'',''null''::jsonb),';
 if strpos(definition,needle)=0 then raise exception 'Undo update changed; review migration';end if;
 execute replace(definition,needle,'layout_config=nullif(v_history.before_state->''layout_config'',''null''::jsonb),'||needle);
end $$;
