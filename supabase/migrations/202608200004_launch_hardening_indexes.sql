-- Cover remaining foreign keys introduced by launch hardening.
create index if not exists subscription_checkout_requests_promotion_idx
  on public.subscription_checkout_requests(promotion_id);
create index if not exists subscription_promo_redemptions_checkout_request_idx
  on public.subscription_promo_redemptions(checkout_request_id);
create index if not exists subscription_promo_redemptions_redeemed_by_idx
  on public.subscription_promo_redemptions(redeemed_by);
create index if not exists subscription_promo_redemptions_tenant_idx
  on public.subscription_promo_redemptions(tenant_id);
create index if not exists subscription_promotions_created_by_idx
  on public.subscription_promotions(created_by);
