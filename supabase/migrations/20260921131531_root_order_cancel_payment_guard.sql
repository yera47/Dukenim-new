-- Platform intervention for unpaid, unfulfilled orders. Existing cancellation
-- triggers return product/material stock and unwind loyalty in the same transaction.
create or replace function public.root_cancel_unpaid_order(
  p_order uuid,
  p_actor uuid,
  p_number bigint,
  p_expected_status public.order_status,
  p_reason text
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  current_order public.orders;
begin
  if not exists(select 1 from public.profiles where user_id = p_actor and role = 'superadmin') then
    raise exception 'Superadmin required' using errcode = '42501';
  end if;
  if char_length(btrim(p_reason)) not between 3 and 1000 then
    raise exception 'Reason required';
  end if;
  select * into current_order from public.orders where id = p_order for update;
  if current_order.id is null or current_order.order_number is distinct from p_number then
    raise exception 'Order confirmation mismatch';
  end if;
  if current_order.status is distinct from p_expected_status then
    raise exception 'Order changed; reload';
  end if;
  if current_order.status in ('cancelled','done') or current_order.payment_status <> 'pending' then
    raise exception 'Completed or paid orders require a separate refund process';
  end if;
  update public.orders set status = 'cancelled' where id = p_order;
  insert into public.platform_audit_events(actor_id, tenant_id, action, reason, metadata)
  values(p_actor, current_order.tenant_id, 'order.root_cancelled', btrim(p_reason),
    jsonb_build_object('order_id', p_order, 'order_number', p_number, 'before', current_order.status, 'payment_status', current_order.payment_status));
  return true;
end $$;

revoke all on function public.root_cancel_unpaid_order(uuid,uuid,bigint,public.order_status,text) from public, anon, authenticated;
grant execute on function public.root_cancel_unpaid_order(uuid,uuid,bigint,public.order_status,text) to service_role;
