-- Yandex courier cost is not known when a buyer places an order.
-- The merchant books the courier and agrees the distance-based price afterward.
alter table public.delivery_zones
  add constraint delivery_zones_yandex_unpriced_check
  check (provider <> 'yandex' or (cost = 0 and free_from is null));

comment on column public.delivery_zones.provider is
  'Merchant-selected fulfilment partner. Yandex courier booking and distance-based pricing are handled manually after the order.';
