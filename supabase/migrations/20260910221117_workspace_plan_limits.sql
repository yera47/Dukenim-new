-- Count product cards, not variants. Existing cards remain after a downgrade.
create function public.enforce_product_plan_capacity() returns trigger
language plpgsql security definer set search_path='' as $$
declare shop public.tenants; capacity integer; used_count bigint;
begin
 if TG_OP='UPDATE' and new.tenant_id=old.tenant_id then return new; end if;
 -- Serialize concurrent inserts for this tenant, including owner/staff RPCs.
 select * into shop from public.tenants where id=new.tenant_id for update;
 if shop.id is null then raise exception 'Store not found';end if;
 capacity:=case when (case when shop.status::text='trial' and shop.trial_ends_at>now()
 then coalesce(shop.next_plan,shop.plan) else shop.plan end)::text='basic' then 200 else 2000 end;
 select count(*) into used_count from public.products where tenant_id=new.tenant_id;
 if used_count>=capacity then raise exception 'Достигнут лимит тарифа: % товаров. Измените тариф перед добавлением новых товаров.',capacity using errcode='23514';end if;
 return new;
end $$;
revoke all on function public.enforce_product_plan_capacity() from public,anon,authenticated;
create trigger product_plan_capacity before insert or update of tenant_id on public.products
 for each row execute function public.enforce_product_plan_capacity();
