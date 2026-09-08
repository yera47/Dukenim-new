-- Only future status transitions are affected; no historical order is rewritten.
create function public.enforce_order_cancellation()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if old.status='cancelled' and new.status<>old.status then raise exception 'Cancelled order cannot be reopened'; end if;
 if new.status='cancelled' and old.status<>'cancelled' and (old.payment_status='paid' or new.payment_status='paid') then raise exception 'Refund payment before cancellation'; end if;
 return new;
end; $$;
revoke all on function public.enforce_order_cancellation() from public,anon,authenticated;
create trigger enforce_order_cancellation before update of status on public.orders
for each row execute function public.enforce_order_cancellation();

create function public.return_cancelled_order_stock()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.status='cancelled' and old.status<>'cancelled' then
  -- Restore only still-debited stock; preserve any earlier recorded returns.
  insert into public.stock_movements(tenant_id,variant_id,delta,reason,order_id)
  select new.tenant_id,variant_id,(-sum(delta))::integer,'return',new.id
  from public.stock_movements
  where order_id=new.id and tenant_id=new.tenant_id and reason in ('sale','return')
  group by variant_id having sum(delta)<0
  order by variant_id;
 end if;
 return new;
end; $$;
revoke all on function public.return_cancelled_order_stock() from public,anon,authenticated;
create trigger return_cancelled_order_stock after update of status on public.orders
for each row execute function public.return_cancelled_order_stock();
