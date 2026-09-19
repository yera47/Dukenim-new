begin;
do $$
declare shop uuid=gen_random_uuid();owner_id uuid=gen_random_uuid();buyer uuid=gen_random_uuid();product uuid=gen_random_uuid();variant uuid=gen_random_uuid();category uuid=gen_random_uuid();gift uuid=gen_random_uuid();coffee uuid=gen_random_uuid();spend uuid=gen_random_uuid();referral uuid=gen_random_uuid();cashback uuid=gen_random_uuid();expiring uuid=gen_random_uuid();base jsonb;rules jsonb;created record;earned_order uuid;code uuid;progress jsonb;
begin
 insert into auth.users(id,email) values(owner_id,owner_id||'@example.invalid'),(buyer,buyer||'@example.invalid');
 insert into public.tenants(id,slug,name,phone,status,plan,catalog_published,business_vertical) values(shop,'rules-'||shop,'Dukenim rules fixture','00000000000','active','basic',true,'food');
 insert into public.tenant_users(tenant_id,user_id,role) values(shop,owner_id,'owner');
 insert into public.tenant_settings(tenant_id,pickup_enabled,delivery_enabled) values(shop,true,false);
 insert into public.categories(id,tenant_id,name,slug) values(category,shop,'Кофе','coffee');
 insert into public.products(id,tenant_id,title,price,is_active,category_id) values(product,shop,'Coffee',1000,true,category);
 insert into public.product_variants(id,tenant_id,product_id,stock_qty,is_active) values(variant,shop,product,100,true);
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 base='{"trigger":"orders","threshold":1,"category":"","reward":"gift","label":"Coffee gift","value":1,"minOrder":0,"expiryDays":0,"repeat":true,"earnOnReward":false}';
 rules=jsonb_build_array(base||jsonb_build_object('id',gift,'threshold',2),base||jsonb_build_object('id',coffee,'trigger','product','category','Кофе','threshold',6),base||jsonb_build_object('id',spend,'trigger','spend','threshold',5000,'reward','fixed','value',500),base||jsonb_build_object('id',referral,'trigger','referral','reward','percent','value',20),base||jsonb_build_object('id',cashback,'reward','cashback','value',10),base||jsonb_build_object('id',expiring,'reward','percent','value',15,'expiryDays',1));
 perform public.save_loyalty_program(shop,jsonb_build_object('name','Клуб гостей','enabled',true,'terms','Rules','rules',rules));
 if (select count(*) from public.loyalty_rules where tenant_id=shop and active)<>6 then raise exception 'Multi-rule program not saved';end if;
 perform public.claim_buyer_orders(shop,owner_id,repeat('d',64),'{}');
 select referral_code into code from public.buyer_members where tenant_id=shop and user_id=owner_id;
 select * into created from public.create_buyer_order(shop,'Buyer','77000000000','pickup','',null,'cash',jsonb_build_array(jsonb_build_object('variant_id',variant,'qty',6)),null,buyer,repeat('e',64),null,null,code);
 earned_order=created.order_id;
 if public.loyalty_rule_progress(coffee,buyer)->'available'<>'null'::jsonb then raise exception 'Pending order earned a gift';end if;
 update public.orders set status='done',payment_status='paid' where id=earned_order;
 if public.loyalty_rule_progress(coffee,buyer)->'available'->>'reward'<>'gift' then raise exception 'Six coffees did not earn gift';end if;
 if public.loyalty_rule_progress(spend,buyer)->'available'->>'value'<>'500' then raise exception 'Spend goal failed';end if;
 if public.loyalty_rule_progress(cashback,buyer)->'available'->>'value'<>'600' then raise exception 'Cashback amount failed';end if;
 if public.loyalty_rule_progress(referral,owner_id)->'available'->>'value'<>'20' then raise exception 'Verified referral failed';end if;
 select * into created from public.create_buyer_order(shop,'Buyer','77000000000','pickup','',null,'cash',jsonb_build_array(jsonb_build_object('variant_id',variant,'qty',1)),null,buyer,repeat('e',64),cashback,1);
 if created.total<>400 then raise exception 'Cashback redemption incorrect';end if;
 update public.orders set status='done',payment_status='paid' where id=created.order_id;
 if public.loyalty_rule_progress(referral,owner_id)->>'progress'<>'1' then raise exception 'Friend counted twice';end if;
 if public.loyalty_rule_progress(coffee,buyer)->>'progress'<>'6' then raise exception 'Reward order improperly earned';end if;
 update public.buyer_order_access set completed_at=now()-interval '2 days' where order_id=earned_order;
 if public.loyalty_rule_progress(expiring,buyer)->'available'<>'null'::jsonb then raise exception 'Expired reward available';end if;
 -- A tiny unconsumed cashback (rounded to zero) must not block later rewards.
 declare tiny_buyer uuid=gen_random_uuid(); tiny_order uuid;
 begin
 insert into auth.users(id,email) values(tiny_buyer,tiny_buyer||'@example.invalid');
 update public.products set price=1 where id=product;
 select * into created from public.create_buyer_order(shop,'Buyer','77000000001','pickup','',null,'cash',jsonb_build_array(jsonb_build_object('variant_id',variant,'qty',1)),null,tiny_buyer,repeat('f',64));
 tiny_order=created.order_id;
 update public.orders set status='done',payment_status='paid' where id=tiny_order;
 update public.buyer_order_access set completed_at=now()-interval '1 minute' where order_id=tiny_order;
 update public.products set price=1000 where id=product;
 select * into created from public.create_buyer_order(shop,'Buyer','77000000001','pickup','',null,'cash',jsonb_build_array(jsonb_build_object('variant_id',variant,'qty',1)),null,tiny_buyer,repeat('f',64));
 update public.orders set status='done',payment_status='paid' where id=created.order_id;
 if public.loyalty_rule_progress(cashback,tiny_buyer)->'available'->>'value'<>'100' then raise exception 'Zero cashback blocked next reward';end if;
 end;
 -- Retire one rule: earned gifts remain redeemable under immutable old conditions.
 perform public.save_loyalty_program(shop,jsonb_build_object('name','Клуб гостей','enabled',false,'terms','Paused','rules',jsonb_build_array(base||jsonb_build_object('id',gift,'threshold',2))));
 if public.loyalty_rule_progress(coffee,buyer)->'available'->>'reward'<>'gift' then raise exception 'Retired gift erased';end if;
 select * into created from public.create_buyer_order(shop,'Buyer','77000000000','pickup','',null,'cash',jsonb_build_array(jsonb_build_object('variant_id',variant,'qty',1)),null,buyer,repeat('e',64),coffee,1);
 if not exists(select 1 from public.buyer_order_access where order_id=created.order_id and reward_label='Coffee gift') then raise exception 'Kitchen gift missing';end if;
 begin perform public.save_loyalty_program(shop,jsonb_build_object('name','Changed','enabled',true,'terms','','rules',jsonb_build_array(base||jsonb_build_object('id',gift,'threshold',3))));raise exception 'Existing rule mutated';exception when others then if sqlerrm<>'Changed rule requires new id' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',buyer::text,true);
 begin perform public.save_loyalty_program(shop,jsonb_build_object('name','Forged','enabled',true,'terms','','rules',rules));raise exception 'Buyer edited merchant program';exception when others then if sqlerrm<>'Forbidden' then raise;end if;end;
end $$;
rollback;
