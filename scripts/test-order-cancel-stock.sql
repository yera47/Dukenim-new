begin;
do $$ declare t uuid;p uuid;v uuid;r record;actor uuid; begin
 select tenant_id,user_id into t,actor from public.tenant_users where role='owner' limit 1;
 update public.tenants set status='active' where id=t;
 update public.tenant_settings set pickup_enabled=true,min_order=0 where tenant_id=t;
 insert into public.products(tenant_id,title,price,is_active) values(t,'Synthetic cancellation fixture',1000,true) returning id into p;
 insert into public.product_variants(tenant_id,product_id,is_active) values(t,p,true) returning id into v;
 insert into public.stock_movements(tenant_id,variant_id,delta,reason) values(t,v,3,'restock');
 select * into r from public.create_storefront_order_v2(t,'Synthetic buyer','+70000000000','pickup','',null,'cash',jsonb_build_array(jsonb_build_object('variant_id',v,'qty',2)));
 perform set_config('test.order',r.order_id::text,true);
 perform set_config('test.variant',v::text,true);
 perform set_config('request.jwt.claim.sub',actor::text,true);
end $$;
set local role authenticated;
do $$ declare o uuid:=current_setting('test.order')::uuid;v uuid:=current_setting('test.variant')::uuid; begin
 if (select stock_qty from public.product_variants where id=v)<>1 then raise exception 'Initial debit missing'; end if;
 update public.orders set payment_status='paid' where id=o;
 begin
  update public.orders set status='cancelled' where id=o;
  raise exception 'Paid cancellation allowed';
 exception when raise_exception then if sqlerrm<>'Refund payment before cancellation' then raise; end if;end;
 if (select stock_qty from public.product_variants where id=v)<>1 then raise exception 'Rejected operation changed stock'; end if;
 update public.orders set payment_status='refunded' where id=o;
 update public.orders set status='cancelled' where id=o;
 if (select stock_qty from public.product_variants where id=v)<>3 then raise exception 'Cancellation return failed'; end if;
 update public.orders set status='cancelled' where id=o;
 if (select stock_qty from public.product_variants where id=v)<>3 then raise exception 'Duplicate return'; end if;
 begin
  update public.orders set status='new' where id=o;
  raise exception 'Reopen allowed';
 exception when raise_exception then if sqlerrm<>'Cancelled order cannot be reopened' then raise; end if;end;
end $$;
rollback;
