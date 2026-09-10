create function public.staff_apply_design(p_access uuid,p_generation uuid,p_expected timestamptz) returns boolean
language plpgsql security definer set search_path='' as $$
declare member public.staff_access; current_design public.tenant_storefront_settings; proposal jsonb;
begin
 select * into member from public.staff_access where id=p_access and user_id=auth.uid() and active for share;
 if member.id is null or member.permissions->>'studio' is distinct from 'write' then raise exception 'Access denied' using errcode='42501';end if;
 perform 1 from public.tenants t where t.id=member.tenant_id and (t.status='active' or (t.status='trial' and t.trial_ends_at>now())) and (case when t.status='trial' then coalesce(t.next_plan,t.plan) else t.plan end)::text<>'basic' for share;
 if not found then raise exception 'Store unavailable' using errcode='42501';end if;
 select * into current_design from public.tenant_storefront_settings where tenant_id=member.tenant_id for update;
 if current_design.tenant_id is null or current_design.updated_at is distinct from p_expected then raise exception 'Design conflict' using errcode='40001';end if;
 select output into proposal from public.ai_studio_generations where id=p_generation and tenant_id=member.tenant_id and intent='store_design';
 if (proposal->>'templateKey' in ('atelier','studio','market','journal','gallery','signature') and proposal->>'paletteKey' in ('mono','ink-brass','paper-forest','clay-milk','ocean-sand','plum-stone','cobalt-cloud','olive-linen','cherry-cream','terra-charcoal','mint-charcoal','rose-ink','sunset-navy') and length(proposal->>'heroTitle') between 2 and 90 and length(proposal->>'heroSubtitle') between 2 and 180 and length(proposal->>'heroCtaLabel') between 2 and 36) is not true then raise exception 'Invalid proposal';end if;
 if proposal ? 'brandColor' and (proposal->>'brandColor' ~ '^#[0-9a-fA-F]{6}$') is not true then raise exception 'Invalid color';end if;
 update public.tenant_storefront_settings set template_key=proposal->>'templateKey',palette_key=proposal->>'paletteKey',brand_color=coalesce(proposal->>'brandColor',brand_color),color_theme=coalesce(proposal->'colorTheme',color_theme),hero_title=proposal->>'heroTitle',hero_subtitle=proposal->>'heroSubtitle',hero_cta_label=proposal->>'heroCtaLabel',updated_at=clock_timestamp() where tenant_id=member.tenant_id;
 insert into public.platform_audit_events(actor_id,tenant_id,action,metadata) values(auth.uid(),member.tenant_id,'staff.design.apply',jsonb_build_object('generation',p_generation));
 return true;
end $$;
revoke all on function public.staff_apply_design(uuid,uuid,timestamptz) from public,anon;
grant execute on function public.staff_apply_design(uuid,uuid,timestamptz) to authenticated;
