alter table public.orders
  add column timing_mode text not null default 'asap',
  add column requested_for timestamptz,
  add constraint orders_timing_mode_check check (timing_mode in ('asap', 'scheduled')),
  add constraint orders_requested_time_check check (
    (timing_mode = 'asap' and requested_for is null)
    or (timing_mode = 'scheduled' and requested_for is not null)
  );

create or replace function public.create_storefront_order_v2(
  p_tenant_id uuid, p_name text, p_phone text, p_delivery_method text,
  p_delivery_address text, p_zone_id uuid, p_payment_method text,
  p_items jsonb, p_requested_for timestamptz
)
returns table(order_id uuid, order_number integer, total integer)
language plpgsql security definer set search_path = '' as $$
declare created record;
begin
  if p_requested_for is not null and (
    p_requested_for < now() + interval '15 minutes'
    or p_requested_for > now() + interval '14 days'
  ) then raise exception 'Requested time unavailable'; end if;

  select * into created from public.create_storefront_order_v2(
    p_tenant_id, p_name, p_phone, p_delivery_method, p_delivery_address,
    p_zone_id, p_payment_method, p_items
  );
  update public.orders
  set timing_mode = case when p_requested_for is null then 'asap' else 'scheduled' end,
      requested_for = p_requested_for
  where id = created.order_id and tenant_id = p_tenant_id;
  return query select created.order_id, created.order_number, created.total;
end;
$$;

revoke all on function public.create_storefront_order_v2(uuid, text, text, text, text, uuid, text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.create_storefront_order_v2(uuid, text, text, text, text, uuid, text, jsonb, timestamptz) to service_role;
