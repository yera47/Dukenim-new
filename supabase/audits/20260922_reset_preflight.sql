-- Read-only production reset preflight. Run again immediately before any deletion.
-- Do not infer that payment_status=paid proves cash settlement.
with preserved_root as (
  select u.id, u.email, p.role
  from auth.users u
  join public.profiles p on p.user_id = u.id
  where u.id = '6d4bb2fd-887f-439d-8480-14a97eb973cf'::uuid
), inventory as (
  select
    (select count(*) from auth.users) as auth_users,
    (select count(*) from auth.users where id <> '6d4bb2fd-887f-439d-8480-14a97eb973cf'::uuid) as users_to_remove,
    (select count(*) from public.tenants) as tenants,
    (select count(*) from public.orders) as orders,
    (select count(*) from public.orders where payment_status = 'paid') as orders_marked_paid,
    (select coalesce(sum(total), 0) from public.orders where payment_status = 'paid') as marked_paid_kzt,
    (select count(*) from storage.objects) as storage_objects,
    (select count(*) from storage.objects where owner_id is not null and owner_id <> '6d4bb2fd-887f-439d-8480-14a97eb973cf') as target_owned_objects,
    (select count(*) from public.staff_invitations) as staff_invitations,
    (select count(*) from public.buyer_members) as buyer_members,
    (select count(*) from public.buyer_order_access) as buyer_order_access,
    (select count(*) from public.buyer_referrals) as buyer_referrals,
    (select count(*) from public.loyalty_redemptions) as loyalty_redemptions
)
select p.id = '6d4bb2fd-887f-439d-8480-14a97eb973cf'::uuid
       and p.email = 'yersat47@gmail.com'
       and p.role = 'superadmin' as preserved_root_verified,
       i.*
from inventory i
left join preserved_root p on true;
