-- No elevated privileges: tenant RLS and explicit owner membership both apply.
create or replace function public.create_catalog_atomic(p_tenant_id uuid,p_name text,p_template text,p_palette text,p_brand_color text default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_tenant public.tenants%rowtype; v_plan text;
begin
  if auth.uid() is null or not exists(select 1 from public.tenant_users where tenant_id=p_tenant_id and user_id=auth.uid() and role='owner') then
    raise exception 'Owner required';
  end if;
  select * into v_tenant from public.tenants where id=p_tenant_id for update;
  if not found then raise exception 'Store unavailable'; end if;
  if v_tenant.catalog_status <> 'not_started' then raise exception 'Catalog already created'; end if;
  if (v_tenant.status='active' or (v_tenant.status='trial' and v_tenant.trial_ends_at>now())) is not true then raise exception 'Entitlement inactive'; end if;
  v_plan:=case when v_tenant.status='trial' then coalesce(v_tenant.next_plan,v_tenant.plan)::text else v_tenant.plan::text end;
  if length(trim(coalesce(p_name,''))) not between 2 and 80 then raise exception 'Invalid catalog name'; end if;
  if p_template is null or not ((v_plan='basic' and p_template in ('atelier','market','studio')) or (v_plan in ('standard','pro') and p_template in ('journal','gallery','signature'))) then raise exception 'Template unavailable'; end if;
  if p_palette is null or p_palette not in ('mono','ink-brass','paper-forest','clay-milk','ocean-sand','plum-stone','cobalt-cloud','olive-linen','cherry-cream','terra-charcoal','mint-charcoal','rose-ink','sunset-navy') then raise exception 'Invalid palette'; end if;
  if p_brand_color is not null and (v_plan='basic' or p_brand_color !~ '^#[0-9a-fA-F]{6}$') then raise exception 'Invalid brand color'; end if;
  insert into public.tenant_storefront_settings(tenant_id,template_key,palette_key,brand_color,hero_cta_label)
  values(p_tenant_id,p_template,p_palette,p_brand_color,'Смотреть каталог')
  on conflict(tenant_id) do update set template_key=excluded.template_key,palette_key=excluded.palette_key,brand_color=excluded.brand_color,updated_at=now();
  update public.tenants set catalog_name=trim(p_name),catalog_status='building',catalog_created_at=now() where id=p_tenant_id;
  if not found then raise exception 'Catalog not saved'; end if;
  return p_tenant_id;
end $$;
revoke all on function public.create_catalog_atomic(uuid,text,text,text,text) from public,anon;
grant execute on function public.create_catalog_atomic(uuid,text,text,text,text) to authenticated;
