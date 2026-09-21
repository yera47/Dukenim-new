alter table public.delivery_zones
  add column if not exists provider text not null default 'own';

alter table public.delivery_zones
  add constraint delivery_zones_provider_check check (provider in ('own', 'yandex'));

comment on column public.delivery_zones.provider is
  'Merchant-selected fulfilment partner. Yandex zones use the merchant price; Dukenim does not book a courier automatically.';
