-- Read only one bounded page after checking the caller's current staff membership.
create function public.staff_module_page(p_access uuid, p_module text, p_offset integer, p_limit integer)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  member public.staff_access;
  rows jsonb := '[]'::jsonb;
  more boolean;
begin
  if p_module not in ('catalog', 'stock', 'customers')
     or p_offset is null or p_offset < 0 or p_offset > 1000000
     or p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Invalid staff page' using errcode = '22023';
  end if;
  select * into member from public.staff_access
    where id = p_access and user_id = auth.uid() and active for share;
  if member.id is null or coalesce(member.permissions->>p_module, 'none') not in ('read', 'write') then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if p_module in ('stock', 'customers') and not exists (
    select 1 from public.tenants t where t.id = member.tenant_id
      and (case when t.status = 'trial' then coalesce(t.next_plan, t.plan) else t.plan end)::text <> 'basic'
  ) then
    raise exception 'Module unavailable' using errcode = '42501';
  end if;

  if p_module = 'catalog' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'title', q.title, 'description', q.description,
      'price', q.price, 'is_active', q.is_active
    ) order by q.created_at desc, q.id desc), '[]'::jsonb) into rows
    from (select id, title, description, price, is_active, created_at
          from public.products where tenant_id = member.tenant_id
          order by created_at desc, id desc limit p_limit + 1 offset p_offset) q;
  elsif p_module = 'stock' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'title', q.title, 'size', q.size, 'color', q.color,
      'stock_qty', q.stock_qty
    ) order by q.title, q.id), '[]'::jsonb) into rows
    from (select v.id, p.title, v.size, v.color, v.stock_qty
          from public.product_variants v join public.products p
            on p.id = v.product_id and p.tenant_id = v.tenant_id
          where v.tenant_id = member.tenant_id
          order by p.title, v.id limit p_limit + 1 offset p_offset) q;
  else
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'name', q.name, 'phone', q.phone,
      'orders_count', q.orders_count
    ) order by q.last_order desc nulls last, q.id desc), '[]'::jsonb) into rows
    from (select id, name, phone, orders_count, last_order
          from public.customers where tenant_id = member.tenant_id
          order by last_order desc nulls last, id desc limit p_limit + 1 offset p_offset) q;
  end if;
  more := jsonb_array_length(rows) > p_limit;
  if more then rows := rows - p_limit; end if;
  return jsonb_build_object('items', rows, 'hasMore', more);
end $$;

revoke all on function public.staff_module_page(uuid,text,integer,integer) from public, anon;
grant execute on function public.staff_module_page(uuid,text,integer,integer) to authenticated;
