-- A merchant confirms both the money and the order in one action. The buyer
-- should not keep seeing a paid order as still waiting for merchant approval.
create or replace function public.manage_kaspi_remote_order(p_order uuid,p_action text,p_reference text default null)
returns text language plpgsql security definer set search_path='' as $$
declare existing public.orders%rowtype; reference_text text := btrim(coalesce(p_reference,''));
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into existing from public.orders where id=p_order for update;
  if not found or existing.payment_method<>'kaspi' or not (
    public.is_superadmin() or exists(select 1 from public.tenant_users u
      where u.tenant_id=existing.tenant_id and u.user_id=auth.uid() and u.role='owner')
  ) then raise exception 'Order unavailable'; end if;
  if p_action not in ('invoice_sent','paid','refunded') then raise exception 'Invalid action'; end if;
  if p_action in ('paid','refunded') and (length(reference_text) not between 4 and 100 or reference_text ~ '[[:cntrl:]]')
    then raise exception 'Enter Kaspi transaction reference'; end if;
  if p_action='invoice_sent' then
    if existing.payment_status<>'pending' or existing.status='cancelled' then raise exception 'Invoice unavailable'; end if;
    update public.orders set kaspi_invoice_sent_at=now() where id=p_order;
  elsif p_action='paid' then
    if existing.payment_status<>'pending' or existing.status='cancelled' then raise exception 'Payment transition unavailable'; end if;
    update public.orders
      set payment_status='paid',
          status=case when status='new' then 'confirmed'::public.order_status else status end
      where id=p_order;
  else
    if existing.payment_status<>'paid' then raise exception 'Refund transition unavailable'; end if;
    update public.orders set payment_status='refunded' where id=p_order;
    if existing.status not in ('done','cancelled') then
      update public.orders set status='cancelled' where id=p_order;
    end if;
  end if;
  insert into public.platform_audit_events(actor_id,tenant_id,action,metadata)
    values(auth.uid(),existing.tenant_id,'kaspi.remote.'||p_action,
      jsonb_build_object('order_id',p_order,'order_number',existing.order_number,'total',existing.total,
        'reference',nullif(reference_text,''),'previous_status',existing.status));
  return p_action;
end $$;

