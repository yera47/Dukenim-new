create or replace function public.snapshot_order_delivery_provider()
returns trigger
language plpgsql
set search_path = ''
as $$
declare selected_provider text;
begin
  if new.delivery_method = 'courier' and new.fulfilment_snapshot->'zone'->>'id' is not null then
    select provider into selected_provider
    from public.delivery_zones
    where id = (new.fulfilment_snapshot->'zone'->>'id')::uuid
      and tenant_id = new.tenant_id;
    if selected_provider is null then raise exception 'Delivery zone unavailable'; end if;
    new.fulfilment_snapshot := jsonb_set(new.fulfilment_snapshot, '{zone,provider}', to_jsonb(selected_provider), true);
  end if;
  return new;
end;
$$;

revoke all on function public.snapshot_order_delivery_provider() from public, anon, authenticated;

drop trigger if exists orders_delivery_provider_snapshot on public.orders;
create trigger orders_delivery_provider_snapshot before insert on public.orders
for each row execute function public.snapshot_order_delivery_provider();
