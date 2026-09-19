begin;
do $$
declare shop uuid=gen_random_uuid();product uuid=gen_random_uuid();variant uuid=gen_random_uuid();buyer uuid=gen_random_uuid();stranger uuid=gen_random_uuid();rid uuid=gen_random_uuid();created record;first_order uuid;reward_order uuid;progress jsonb;history jsonb;rule jsonb;
begin
 insert into auth.users(id,email) values(buyer,buyer||'@example.invalid'),(stranger,stranger||'@example.invalid');
 insert into public.tenants(id,slug,name,phone,status,plan,catalog_published,business_vertical) values(shop,'loyalty-'||shop,'Loyalty fixture','00000000000','active','basic',true,'food');
 insert into public.tenant_settings(tenant_id,pickup_enabled,delivery_enabled) values(shop,true,false);
 insert into public.products(id,tenant_id,title,price,is_active) values(product,shop,'Coffee',1000,true);
 insert into public.product_variants(id,tenant_id,product_id,stock_qty,is_active) values(variant,shop,product,100,true);
 insert into public.loyalty_programs(tenant_id,name) values(shop,'Coffee card');
 rule=jsonb_build_object('id',rid,'trigger','orders','threshold',6,'category','','reward','percent','label','Ten percent','value',10,'minOrder',0,'expiryDays',0,'repeat',true,'earnOnReward',false);
 insert into public.loyalty_rules(id,tenant_id,config) values(rid,shop,rule);
 for i in 1..6 loop
  select * into created from public.create_buyer_order(shop,'Buyer','77000000000','pickup','',null,'cash',jsonb_build_array(jsonb_build_object('variant_id',variant,'qty',1)),null,buyer,repeat('a',64));
  if i=1 then first_order=created.order_id;end if;
  update public.orders set status='done',payment_status='paid' where id=created.order_id;
 end loop;
 progress=public.loyalty_rule_progress(rid,buyer);
 if (progress->>'progress')::integer<>6 or progress->'available'->>'milestone'<>'1' then raise exception 'Six purchases must unlock reward: %',progress;end if;
 select * into created from public.create_buyer_order(shop,'Buyer','77000000000','pickup','',null,'cash',jsonb_build_array(jsonb_build_object('variant_id',variant,'qty',1)),null,buyer,repeat('a',64),rid,1);
 reward_order=created.order_id;
 if created.total<>900 then raise exception 'Discount not applied';end if;
 if public.loyalty_rule_progress(rid,buyer)->'available'<>'null'::jsonb then raise exception 'Reward reused';end if;
 begin
  perform public.create_buyer_order(shop,'Buyer','77000000000','pickup','',null,'cash',jsonb_build_array(jsonb_build_object('variant_id',variant,'qty',1)),null,buyer,repeat('a',64),rid,1);
  raise exception 'Replay accepted';
 exception when others then if sqlerrm<>'Reward unavailable' then raise;end if;end;
 update public.orders set status='cancelled' where id=reward_order;
 if public.loyalty_rule_progress(rid,buyer)->'available'->>'milestone'<>'1' then raise exception 'Cancelled reward not restored';end if;
 update public.orders set payment_status='refunded' where id=first_order;
 if public.loyalty_rule_progress(rid,buyer)->'available'<>'null'::jsonb then raise exception 'Refund still qualifies';end if;
 history=public.buyer_history(shop,stranger,repeat('a',64));
 if jsonb_array_length(history->'orders')<>0 then raise exception 'Cookie leaks claimed account orders';end if;
 history=public.buyer_history(shop,buyer,repeat('b',64));
 if jsonb_array_length(history->'orders')<>7 then raise exception 'Account history lost across browsers';end if;
 -- Ownership transfer requires a verified guest receipt and never reassigns an account.
 perform public.claim_buyer_orders(shop,stranger,repeat('a',64),array[first_order]);
 if exists(select 1 from public.buyer_order_access where order_id=first_order and user_id<>buyer) then raise exception 'Account reassigned';end if;
 if has_function_privilege('anon','public.create_buyer_order(uuid,text,text,text,text,uuid,text,jsonb,timestamptz,uuid,text,uuid,integer,uuid)','execute') or has_function_privilege('authenticated','public.buyer_history(uuid,uuid,text,integer)','execute') then raise exception 'Private RPC exposed';end if;
end $$;
rollback;
