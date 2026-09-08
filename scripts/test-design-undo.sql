begin;
do $$ declare actor uuid; begin
 select tu.user_id into actor from public.tenant_users tu join public.tenants t on t.id=tu.tenant_id join public.tenant_storefront_settings s on s.tenant_id=t.id
 where tu.role='owner' and (t.status='active' or (t.status='trial' and t.trial_ends_at>now())) and coalesce(t.next_plan,t.plan)::text in ('standard','pro') limit 1;
 if actor is null then raise exception 'No eligible fixture'; end if;
 perform set_config('request.jwt.claim.sub',actor::text,true);
end $$;
set local role authenticated;
do $$ declare shop uuid; original text; entry uuid; begin
 select s.tenant_id,s.hero_title into shop,original from public.tenant_storefront_settings s join public.tenant_users tu on tu.tenant_id=s.tenant_id where tu.user_id=auth.uid() and tu.role='owner' limit 1;
 update public.tenant_storefront_settings set hero_title='Undo transaction fixture' where tenant_id=shop;
 select id into entry from public.storefront_design_history where tenant_id=shop order by created_at desc,id desc limit 1;
 if entry is null then raise exception 'No history captured'; end if;
 perform public.undo_storefront_design(shop,entry);
 if (select hero_title from public.tenant_storefront_settings where tenant_id=shop) is distinct from original then raise exception 'Restore failed'; end if;
 begin
  perform public.undo_storefront_design(shop,entry);
  raise exception 'Replay accepted';
 exception when raise_exception then if sqlerrm <> 'Design conflict' then raise; end if;
 end;
 if exists(select 1 from public.storefront_design_history h where not exists(select 1 from public.tenant_users tu where tu.tenant_id=h.tenant_id and tu.user_id=auth.uid())) then raise exception 'Other history visible'; end if;
end $$;
rollback;
