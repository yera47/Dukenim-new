begin;
do $$
declare shop uuid=gen_random_uuid();other_shop uuid=gen_random_uuid();product uuid=gen_random_uuid();drink uuid=gen_random_uuid();variant uuid=gen_random_uuid();drink_variant uuid=gen_random_uuid();created record;config jsonb;items jsonb;prepared jsonb;
begin
 insert into public.tenants(id,slug,name,phone,status,plan,catalog_published,business_vertical) values(shop,'food-'||shop,'Dukenim food fixture','00000000000','active','basic',true,'food'),(other_shop,'other-'||other_shop,'Other fixture','00000000000','active','basic',true,'food');
 insert into public.tenant_settings(tenant_id,pickup_enabled,delivery_enabled) values(shop,true,false);
 insert into public.products(id,tenant_id,title,price,is_active) values(product,shop,'Combo',2000,true),(drink,shop,'Coffee',1000,true);
 insert into public.product_variants(id,tenant_id,product_id,stock_qty,is_active) values(variant,shop,product,20,true),(drink_variant,shop,drink,20,true);
 config=jsonb_build_object('ingredients',jsonb_build_array(jsonb_build_object('id','cucumber','name','Cucumber','removable',true)),'groups',jsonb_build_array(jsonb_build_object('id','drink','title','Drink','kind','combo','min',1,'max',1,'options',jsonb_build_array(jsonb_build_object('id','coffee','label','Coffee','price',300,'variantId',drink_variant)))));
 update public.products set food_options=config where id=product;
 items=jsonb_build_array(jsonb_build_object('variant_id',variant,'qty',2,'selection',jsonb_build_object('removed',jsonb_build_array('cucumber'),'choices',jsonb_build_object('drink',jsonb_build_array('coffee')))));
 select * into created from public.create_buyer_order(shop,'Buyer','77000000000','pickup','',null,'cash',items,null,null,repeat('c',64));
 if created.total<>4600 then raise exception 'Combo surcharge incorrect: %',created.total;end if;
 if not exists(select 1 from public.product_variants where id=drink_variant and stock_qty=18) then raise exception 'Combo child stock not deducted';end if;
 if not exists(select 1 from public.order_items where order_id=created.order_id and variant_id=variant and options_snapshot @> '["Без Cucumber","Drink: Coffee"]' and price_snapshot=2300) then raise exception 'Kitchen choices not preserved';end if;
 if not exists(select 1 from public.order_items where order_id=created.order_id and variant_id=drink_variant and price_snapshot=0 and qty=2 and combo_parent=1) then raise exception 'Combo component not preserved';end if;
 update public.orders set status='cancelled' where id=created.order_id;
 if exists(select 1 from public.product_variants where id in(variant,drink_variant) and stock_qty<>20) then raise exception 'Cancellation did not restore entire combo';end if;
 begin perform public.prepare_food_order(shop,jsonb_build_array(jsonb_build_object('variant_id',variant,'qty',1)));raise exception 'Required combo bypassed';exception when others then if sqlerrm<>'Option count unavailable' then raise;end if;end;
 begin perform public.prepare_food_order(other_shop,items);raise exception 'Cross tenant choice accepted';exception when others then if sqlerrm<>'Variant unavailable' then raise;end if;end;
 begin perform public.prepare_food_order(shop,jsonb_build_array(jsonb_build_object('variant_id',variant,'qty',1,'selection','{"removed":["invented"],"choices":{"drink":["coffee"]}}'::jsonb)));raise exception 'Fake ingredient accepted';exception when others then if sqlerrm<>'Ingredient unavailable' then raise;end if;end;
 -- Same product with distinct recipes remains distinct on the kitchen ticket.
 items=items||jsonb_build_array(jsonb_build_object('variant_id',variant,'qty',1,'selection','{"removed":[],"choices":{"drink":["coffee"]}}'::jsonb));
 select * into created from public.create_buyer_order(shop,'Buyer','77000000000','pickup','',null,'cash',items,null,null,repeat('c',64));
 if (select count(*) from public.order_items where order_id=created.order_id and variant_id=variant)<>2 then raise exception 'Different recipes merged';end if;
 if not exists(select 1 from public.product_variants where id=variant and stock_qty=17) or not exists(select 1 from public.product_variants where id=drink_variant and stock_qty=17) then raise exception 'Aggregate combo stock incorrect';end if;
 -- Price sent by client is ignored.
 prepared=public.prepare_food_order(shop,jsonb_set(items,'{0,price}','1'));
 if prepared->>'subtotal'<>'6900' then raise exception 'Client price trusted';end if;
end $$;
rollback;
