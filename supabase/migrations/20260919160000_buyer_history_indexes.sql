create index buyer_members_user_idx on public.buyer_members(user_id);
create index buyer_order_access_user_idx on public.buyer_order_access(user_id);
create index buyer_referrals_user_idx on public.buyer_referrals(user_id);
create index buyer_referrals_referrer_idx on public.buyer_referrals(referrer_id);
create index loyalty_redemptions_user_idx on public.loyalty_redemptions(user_id);
