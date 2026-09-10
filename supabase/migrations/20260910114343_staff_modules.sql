create function public.staff_module_data(p_access uuid,p_module text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare member public.staff_access; result jsonb;
begin
 select * into member from public.staff_access where id=p_access and user_id=auth.uid() and active;
 if member.id is null or p_module not in ('catalog','stock','customers','analytics') or member.permissions->>p_module not in ('read','write') then raise exception 'Access denied' using errcode='42501';end if;
 if p_module='catalog' then
  select jsonb_agg(to_jsonb(q)) into result from(select id,title,description,price,is_active from products where tenant_id=member.tenant_id order by created_at desc limit 200)q;
 elsif p_module='stock' then
  select jsonb_agg(to_jsonb(q)) into result from(select v.id,p.title,v.size,v.color,v.stock_qty from product_variants v join products p on p.id=v.product_id and p.tenant_id=v.tenant_id where v.tenant_id=member.tenant_id order by p.title limit 200)q;
 elsif p_module='customers' then
  select jsonb_agg(to_jsonb(q)) into result from(select id,name,phone,orders_count from customers where tenant_id=member.tenant_id order by last_order desc nulls last limit 200)q;
 elsif p_module='analytics' then
  select jsonb_build_array(jsonb_build_object('title','Оплаченные заказы за 30 дней','count',count(*),'total',coalesce(sum(total),0))) into result from orders where tenant_id=member.tenant_id and payment_status='paid' and status<>'cancelled' and created_at>=now()-interval '30 days';
 end if;
 return coalesce(result,'[]'::jsonb);
end $$;
revoke all on function public.staff_module_data(uuid,text) from public,anon;
grant execute on function public.staff_module_data(uuid,text) to authenticated;

create function public.staff_edit(p_access uuid,p_module text,p_id uuid,p_data jsonb) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare member public.staff_access; changed uuid; quantity integer; delta integer;
begin
 select * into member from public.staff_access where id=p_access and user_id=auth.uid() and active for share;
 if member.id is null or p_module not in ('catalog','stock','customers') or member.permissions->>p_module <> 'write' then raise exception 'Access denied' using errcode='42501';end if;
 if p_module='catalog' then
  if (length(trim(p_data->>'title')) between 2 and 200 and length(coalesce(p_data->>'description',''))<=4000 and (p_data->>'price')~'^[0-9]{1,10}$') is not true or (p_data->>'price')::bigint>2000000000 then raise exception 'Invalid product';end if;
  update products set title=trim(p_data->>'title'),description=p_data->>'description',price=(p_data->>'price')::int,is_active=(p_data->>'active')::boolean
  where id=p_id and tenant_id=member.tenant_id and price=(p_data->>'expected_price')::int and title=p_data->>'expected_title' returning id into changed;
 elsif p_module='stock' then
  select stock_qty into quantity from product_variants where id=p_id and tenant_id=member.tenant_id for update;
  if quantity is null or quantity is distinct from (p_data->>'expected')::int then raise exception 'Stock changed; reload';end if;
  if (p_data->>'quantity')~'^[0-9]{1,7}$' is not true then raise exception 'Invalid quantity';end if;
  delta:=(p_data->>'quantity')::int-quantity;
  if delta<>0 then insert into stock_movements(tenant_id,variant_id,delta,reason,staff_id) values(member.tenant_id,p_id,delta,'correction',auth.uid());end if;
  changed:=p_id;
 elsif p_module='customers' then
  if (length(trim(p_data->>'name')) between 1 and 100 and length(p_data->>'phone') between 7 and 30) is not true then raise exception 'Invalid contact';end if;
  update customers set name=trim(p_data->>'name'),phone=p_data->>'phone' where id=p_id and tenant_id=member.tenant_id and phone=p_data->>'expected_phone' returning id into changed;
 end if;
 if changed is null then raise exception 'Record changed; reload';end if;
 insert into platform_audit_events(actor_id,tenant_id,action,metadata) values(auth.uid(),member.tenant_id,'staff.edit.'||p_module,jsonb_build_object('id',p_id));
 return true;
end $$;
revoke all on function public.staff_edit(uuid,text,uuid,jsonb) from public,anon;
grant execute on function public.staff_edit(uuid,text,uuid,jsonb) to authenticated;
