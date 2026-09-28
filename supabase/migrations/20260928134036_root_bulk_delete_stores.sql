create function public.root_bulk_delete_empty_stores(p_stores jsonb, p_actor uuid, p_reason text)
returns integer language plpgsql security invoker set search_path = '' as $$
declare
  item jsonb;
  ids uuid[];
  entry_id uuid;
  shop public.tenants;
  removed integer := 0;
begin
  if not exists(select 1 from public.profiles where user_id = p_actor and role = 'superadmin') then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if jsonb_typeof(p_stores) <> 'array' or jsonb_array_length(p_stores) < 2 or jsonb_array_length(p_stores) > 20 then
    raise exception 'Выберите от 2 до 20 магазинов';
  end if;
  if length(btrim(p_reason)) not between 3 and 1000 then
    raise exception 'Укажите причину удаления';
  end if;
  for item in select value from jsonb_array_elements(p_stores) as e(value) loop
    if jsonb_typeof(item) <> 'object' or (item->>'id') is null or (item->>'slug') is null then
      raise exception 'Некорректный список магазинов';
    end if;
    entry_id := (item->>'id')::uuid;
    if entry_id = any(coalesce(ids, array[]::uuid[])) then raise exception 'Магазин выбран повторно'; end if;
    ids := array_append(ids, entry_id);
  end loop;
  -- Lock in a stable order and verify every slug before attempting any deletion.
  for shop in select * from public.tenants where id = any(ids) order by id for update loop
    if shop.slug = 'dukenim-9b139' then raise exception 'Внутренний магазин нельзя удалить массово'; end if;
  end loop;
  if (select count(*) from public.tenants where id = any(ids)) <> cardinality(ids) then
    raise exception 'Один из магазинов больше не существует';
  end if;
  for item in select value from jsonb_array_elements(p_stores) as e(value) loop
    entry_id := (item->>'id')::uuid;
    if exists(select 1 from public.products where tenant_id = entry_id) then
      raise exception 'Один из магазинов содержит товары. Массовое удаление доступно только для пустых магазинов.';
    end if;
    -- The existing single-store guard checks orders, customers, payments,
    -- subscriptions, active staff and integrations. Any failure rolls back all.
    perform public.root_delete_store(entry_id, p_actor, item->>'slug', p_reason);
    removed := removed + 1;
  end loop;
  return removed;
end $$;

revoke all on function public.root_bulk_delete_empty_stores(jsonb, uuid, text) from public, anon, authenticated;
grant execute on function public.root_bulk_delete_empty_stores(jsonb, uuid, text) to service_role;
