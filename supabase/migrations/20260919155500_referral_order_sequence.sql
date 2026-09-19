do $fix$
declare definition text;
begin
 select pg_get_functiondef(oid) into definition from pg_proc where proname='loyalty_qualifications' and pronamespace='public'::regnamespace;
 definition=replace(definition,'order by a.created_at,o.id','order by o.order_number');
 definition=replace(definition,'join public.buyer_order_access current_order on current_order.order_id=candidates.event_id','join public.buyer_order_access current_order on current_order.order_id=candidates.event_id join public.orders co on co.id=current_order.order_id');
 definition=replace(definition,'(prior.created_at,prior.order_id)<(current_order.created_at,current_order.order_id)','po.order_number<co.order_number');
 execute definition;
end $fix$;
