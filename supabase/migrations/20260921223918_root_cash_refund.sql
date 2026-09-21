-- Superadmin can record a cash refund only after money was actually returned.
-- Kaspi and provider refunds use separate, method-specific paths.
create function public.root_refund_cash_order(p_order uuid,p_number integer,p_total integer,p_reference text,p_reason text)
returns text language plpgsql security definer set search_path='' as $$
declare existing public.orders%rowtype; reference_text text:=btrim(coalesce(p_reference,'')); reason_text text:=btrim(coalesce(p_reason,''));
begin
  if not public.is_superadmin() then raise exception 'Superadmin required'; end if;
  select * into existing from public.orders where id=p_order for update;
  if not found or existing.payment_method<>'cash' or existing.payment_status<>'paid' then raise exception 'Cash refund unavailable'; end if;
  if existing.order_number is distinct from p_number or existing.total is distinct from p_total then raise exception 'Order changed'; end if;
  if length(reference_text) not between 4 and 100 or reference_text ~ '[[:cntrl:]]' then raise exception 'Enter refund receipt reference'; end if;
  if length(reason_text) not between 5 and 1000 or reason_text ~ '[[:cntrl:]]' then raise exception 'Enter refund reason'; end if;
  update public.orders set payment_status='refunded' where id=p_order;
  if existing.status not in ('done','cancelled') then
    update public.orders set status='cancelled' where id=p_order;
  end if;
  insert into public.platform_audit_events(actor_id,tenant_id,action,reason,metadata)
    values(auth.uid(),existing.tenant_id,'order.cash.refunded',reason_text,
      jsonb_build_object('order_id',p_order,'order_number',p_number,'amount',p_total,'receipt_reference',reference_text,'previous_status',existing.status));
  return 'refunded';
end $$;
revoke all on function public.root_refund_cash_order(uuid,integer,integer,text,text) from public,anon,authenticated;
grant execute on function public.root_refund_cash_order(uuid,integer,integer,text,text) to authenticated;
