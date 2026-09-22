-- Keep the guided setup and the existing owner settings on the same delivery/payment model.
-- No Yandex or Kaspi API credentials are created: the merchant performs both actions manually.
create or replace function public.create_catalog_setup(
  p_tenant_id uuid, p_name text, p_template text, p_palette text,
  p_generation_id uuid, p_color_theme jsonb, p_fulfilment jsonb,
  p_payment_preference text
) returns uuid language plpgsql security invoker set search_path='' as $$
declare
  reserve boolean := false;
  hours integer := 24;
  courier text := coalesce(p_fulfilment->>'deliveryProvider', 'own');
begin
  if courier not in ('own', 'yandex') then raise exception 'Invalid delivery provider'; end if;
  if courier = 'yandex' and (p_fulfilment->>'delivery')::boolean
    and p_fulfilment->>'cost' <> '0' then raise exception 'Yandex delivery must be unpriced'; end if;
  if p_fulfilment ? 'reservation' then
    if jsonb_typeof(p_fulfilment->'reservation') is distinct from 'boolean' then raise exception 'Invalid reservation setting'; end if;
    reserve := (p_fulfilment->>'reservation')::boolean;
  end if;
  if reserve then
    if coalesce(p_fulfilment->>'holdHours', '') !~ '^[0-9]{1,2}$' then raise exception 'Invalid hold duration'; end if;
    hours := (p_fulfilment->>'holdHours')::integer;
    if hours not between 1 and 72 then raise exception 'Invalid hold duration'; end if;
  end if;
  perform public.create_catalog_setup_base(
    p_tenant_id, p_name, p_template, p_palette, p_generation_id, p_color_theme,
    case when reserve then p_fulfilment || jsonb_build_object('pickup', true) else p_fulfilment end,
    p_payment_preference
  );
  if reserve then
    update public.tenant_settings set pickup_enabled=(p_fulfilment->>'pickup')::boolean where tenant_id=p_tenant_id;
    insert into public.reservation_settings(tenant_id, enabled, hold_hours, location)
    select p_tenant_id, true, hours, pickup_location from public.tenant_settings where tenant_id=p_tenant_id
    on conflict(tenant_id) do update set enabled=excluded.enabled, hold_hours=excluded.hold_hours, location=excluded.location;
  end if;
  if (p_fulfilment->>'delivery')::boolean then
    update public.delivery_zones set provider=courier
    where tenant_id=p_tenant_id and name=trim(p_fulfilment->>'zone');
    if not found then raise exception 'Delivery zone not saved'; end if;
  end if;
  if p_payment_preference = 'kaspi' then
    -- The owner will send the invoice and confirm actual payment in Kaspi Pay.
    update public.tenant_settings set kaspi_remote_enabled=true where tenant_id=p_tenant_id;
    if not found then raise exception 'Kaspi settings not saved'; end if;
  end if;
  return p_tenant_id;
end $$;
revoke all on function public.create_catalog_setup(uuid,text,text,text,uuid,jsonb,jsonb,text) from public, anon;
grant execute on function public.create_catalog_setup(uuid,text,text,text,uuid,jsonb,jsonb,text) to authenticated;
