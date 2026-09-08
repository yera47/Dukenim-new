create table public.storefront_design_history (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 before_state jsonb not null, after_state jsonb not null,
 created_at timestamptz not null default clock_timestamp()
);
create index on public.storefront_design_history(tenant_id,created_at desc);
alter table public.storefront_design_history enable row level security;
grant select on public.storefront_design_history to authenticated;
create policy design_history_owner_read on public.storefront_design_history for select to authenticated
 using (exists(select 1 from public.tenant_users where tenant_id=storefront_design_history.tenant_id and user_id=auth.uid() and role='owner'));
create function public.capture_storefront_design() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if (to_jsonb(old)-'updated_at') is distinct from (to_jsonb(new)-'updated_at') then
  insert into public.storefront_design_history(tenant_id,before_state,after_state)
  values(new.tenant_id,to_jsonb(old)-'updated_at',to_jsonb(new)-'updated_at');
 end if;
 return new;
end $$;
revoke all on function public.capture_storefront_design() from public,anon,authenticated;
create trigger capture_storefront_design after update on public.tenant_storefront_settings
 for each row execute function public.capture_storefront_design();

create function public.read_storefront_design_history(p_tenant_id uuid) returns jsonb
language sql security invoker set search_path='' as $$
 select coalesce(jsonb_agg(x),'[]'::jsonb) from (
 select id,created_at,before_state->>'hero_title' as title from public.storefront_design_history
 where tenant_id=p_tenant_id order by created_at desc,id desc limit 10
 ) x;
$$;
revoke all on function public.read_storefront_design_history(uuid) from public,anon;
grant execute on function public.read_storefront_design_history(uuid) to authenticated;

create function public.undo_storefront_design(p_tenant_id uuid,p_history_id uuid) returns boolean
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
 if not found or v_history.id<>p_history_id or v_history.after_state is distinct from (to_jsonb(v_current)-'updated_at') then raise exception 'Design conflict'; end if;
 if v_plan='basic' and ((v_history.before_state->>'template_key') not in ('atelier','market','studio') or v_history.before_state->>'brand_color' is not null) then raise exception 'Plan restriction'; end if;
 update public.tenant_storefront_settings set
 template_key=v_history.before_state->>'template_key',palette_key=v_history.before_state->>'palette_key',
 brand_color=v_history.before_state->>'brand_color',hero_title=v_history.before_state->>'hero_title',
 hero_subtitle=v_history.before_state->>'hero_subtitle',hero_image_url=v_history.before_state->>'hero_image_url',
 hero_cta_label=v_history.before_state->>'hero_cta_label',updated_at=clock_timestamp()
 where tenant_id=p_tenant_id;
 return true;
end $$;
revoke all on function public.undo_storefront_design(uuid,uuid) from public,anon;
grant execute on function public.undo_storefront_design(uuid,uuid) to authenticated;
