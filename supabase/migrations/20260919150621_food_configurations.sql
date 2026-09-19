alter table public.products add column food_options jsonb not null default '{"ingredients":[],"groups":[]}';
alter table public.order_items add column options_snapshot jsonb not null default '[]';
alter table public.order_items add column combo_parent integer;

create function public.validate_food_options() returns trigger language plpgsql set search_path='' as $$
declare g jsonb; o jsonb; ingredient jsonb; ids text[]='{}';
begin
 if new.food_options=old.food_options then return new;end if;
 if octet_length(new.food_options::text)>40000 or jsonb_typeof(new.food_options->'ingredients') is distinct from 'array' or jsonb_typeof(new.food_options->'groups') is distinct from 'array' then raise exception 'Invalid food options';end if;
 if jsonb_array_length(new.food_options->'ingredients')>30 or jsonb_array_length(new.food_options->'groups')>8 then raise exception 'Too many options';end if;
 if new.food_options<>'{"ingredients":[],"groups":[]}'::jsonb and not exists(select 1 from public.tenants where id=new.tenant_id and business_vertical='food') then raise exception 'Food options require food store';end if;
 for ingredient in select value from jsonb_array_elements(new.food_options->'ingredients') loop
  if coalesce(ingredient->>'id','')='' or ingredient->>'id'=any(ids) or coalesce(length(btrim(ingredient->>'name')),0) not between 1 and 60 or jsonb_typeof(ingredient->'removable') is distinct from 'boolean' then raise exception 'Invalid ingredient';end if;
  ids=array_append(ids,ingredient->>'id');
 end loop;
 for g in select value from jsonb_array_elements(new.food_options->'groups') loop
  if coalesce(g->>'id','')='' or g->>'id'=any(ids) or coalesce(length(btrim(g->>'title')),0) not between 1 and 80 or coalesce(g->>'kind','') not in ('addon','combo') or jsonb_typeof(g->'options') is distinct from 'array' then raise exception 'Invalid option group';end if;
  ids=array_append(ids,g->>'id');
  if coalesce((g->>'min')::integer,-1) not between 0 and 10 or coalesce((g->>'max')::integer,0) not between 1 and 10 or (g->>'min')::integer>(g->>'max')::integer or jsonb_array_length(g->'options') not between 1 and 20 or (g->>'min')::integer>jsonb_array_length(g->'options') then raise exception 'Invalid option limits';end if;
  for o in select value from jsonb_array_elements(g->'options') loop
   if coalesce(o->>'id','')='' or o->>'id'=any(ids) or coalesce(length(btrim(o->>'label')),0) not between 1 and 80 or coalesce((o->>'price')::integer,-1) not between 0 and 1000000 then raise exception 'Invalid option';end if;
   ids=array_append(ids,o->>'id');
   if g->>'kind'='combo' and not exists(select 1 from public.product_variants v join public.products p on p.id=v.product_id where v.id=(o->>'variantId')::uuid and v.tenant_id=new.tenant_id and p.tenant_id=new.tenant_id and p.id<>new.id) then raise exception 'Combo product unavailable';end if;
  end loop;
 end loop;
 return new;
end $$;
revoke all on function public.validate_food_options() from public,anon,authenticated;
create trigger validate_product_food_options before insert or update of food_options on public.products for each row execute function public.validate_food_options();

-- Resolve labels/prices from merchant data. The buyer supplies option IDs only.
create function public.prepare_food_order(p_tenant uuid,p_items jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare item jsonb; selection jsonb; product record; g jsonb; o jsonb; ingredient jsonb; option_id text; removed_id text; qty integer; price integer; labels jsonb; lines jsonb='[]'; stock jsonb='[]'; child_lines jsonb; chosen jsonb; subtotal bigint=0; line_number integer=0; child record; option_keys text[];
begin
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Invalid cart';end if;
 for item in select value from jsonb_array_elements(p_items) loop
  line_number=line_number+1;
  if coalesce(item->>'qty','') !~ '^[0-9]{1,2}$' then raise exception 'Invalid quantity';end if;
  qty=(item->>'qty')::integer;if qty not between 1 and 20 then raise exception 'Invalid quantity';end if;
  select p.id,p.title,p.price,p.food_options,v.id variant_id into product from public.product_variants v join public.products p on p.id=v.product_id where v.id=(item->>'variant_id')::uuid and v.tenant_id=p_tenant and p.tenant_id=p_tenant and v.is_active and p.is_active;
  if not found then raise exception 'Variant unavailable';end if;
  selection=coalesce(item->'selection','{"removed":[],"choices":{}}');
  if jsonb_typeof(selection->'removed') is distinct from 'array' or jsonb_typeof(selection->'choices') is distinct from 'object' or jsonb_array_length(selection->'removed')>30 then raise exception 'Invalid food selection';end if;
  if (select count(*)<>count(distinct value) from jsonb_array_elements_text(selection->'removed')) then raise exception 'Duplicate ingredient';end if;
  labels='[]';price=product.price;child_lines='[]';option_keys='{}';
  for removed_id in select value from jsonb_array_elements_text(selection->'removed') loop
   select value into ingredient from jsonb_array_elements(product.food_options->'ingredients') where value->>'id'=removed_id and (value->>'removable')::boolean;
   if not found then raise exception 'Ingredient unavailable';end if;
   labels=labels||jsonb_build_array('Без '||(ingredient->>'name'));
  end loop;
  for g in select value from jsonb_array_elements(product.food_options->'groups') loop
   option_keys=array_append(option_keys,g->>'id');chosen=coalesce(selection->'choices'->(g->>'id'),'[]');
   if jsonb_typeof(chosen) is distinct from 'array' then raise exception 'Invalid option choice';end if;
   if jsonb_array_length(chosen)<(g->>'min')::integer or jsonb_array_length(chosen)>(g->>'max')::integer or (select count(*)<>count(distinct value) from jsonb_array_elements_text(chosen)) then raise exception 'Option count unavailable';end if;
   for option_id in select value from jsonb_array_elements_text(chosen) loop
    select value into o from jsonb_array_elements(g->'options') where value->>'id'=option_id;
    if not found then raise exception 'Option unavailable';end if;
    price=price+(o->>'price')::integer;labels=labels||jsonb_build_array((g->>'title')||': '||(o->>'label'));
    if g->>'kind'='combo' then
     select v.id,p.title,p.food_options into child from public.product_variants v join public.products p on p.id=v.product_id where v.id=(o->>'variantId')::uuid and v.tenant_id=p_tenant and p.tenant_id=p_tenant and p.id<>product.id and v.is_active and p.is_active;
     if not found or exists(select 1 from jsonb_array_elements(child.food_options->'groups') c where c->>'kind'='combo' or (c->>'min')::integer>0) then raise exception 'Combo variant unavailable';end if;
     stock=stock||jsonb_build_array(jsonb_build_object('variant_id',child.id,'qty',qty));
     child_lines=child_lines||jsonb_build_array(jsonb_build_object('variant_id',child.id,'title',child.title,'price',0,'qty',qty,'options','[]'::jsonb,'combo_parent',line_number));
    end if;
   end loop;
  end loop;
  if exists(select 1 from jsonb_object_keys(selection->'choices') k where not k=any(option_keys)) then raise exception 'Unknown option group';end if;
  subtotal=subtotal+price::bigint*qty;if subtotal>999999999 then raise exception 'Order too large';end if;
  stock=stock||jsonb_build_array(jsonb_build_object('variant_id',product.variant_id,'qty',qty));
  lines=lines||jsonb_build_array(jsonb_build_object('variant_id',product.variant_id,'title',product.title,'price',price,'qty',qty,'options',labels,'combo_parent',null))||child_lines;
 end loop;
 select jsonb_agg(jsonb_build_object('variant_id',variant_id,'qty',qty) order by variant_id) into stock from (select (s->>'variant_id')::uuid variant_id,sum((s->>'qty')::integer) qty from jsonb_array_elements(stock) s group by 1) aggregated;
 return jsonb_build_object('lines',lines,'stock',stock,'subtotal',subtotal);
end $$;
revoke all on function public.prepare_food_order(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.prepare_food_order(uuid,jsonb) to service_role;
CREATE OR REPLACE FUNCTION public.create_storefront_order_v3(p_tenant_id uuid, p_name text, p_phone text, p_delivery_method text, p_delivery_address text, p_zone_id uuid, p_payment_method text, p_items jsonb, p_requested_for timestamptz)
 RETURNS TABLE(order_id uuid, order_number integer, total integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_prepared jsonb;
  v_customer_id uuid;
  v_order_id uuid;
  v_subtotal integer := 0;
  v_number integer;
  v_item jsonb;
  v_variant record;
  v_qty integer;
  v_seen uuid[] := '{}';
  v_variant_id uuid;
  v_delivery_enabled boolean := false;
  v_pickup_enabled boolean := true;
  v_min_order integer := 0;
  v_delivery_cost integer := 0;
  v_zone record;
  v_pickup_location jsonb;
  v_fulfilment_snapshot jsonb;
begin
  if p_requested_for is not null and (p_requested_for<now()+interval '15 minutes' or p_requested_for>now()+interval '14 days') then raise exception 'Requested time unavailable';end if;
  if not exists (
    select 1 from public.tenants
    where id = p_tenant_id
      and (status = 'active' or (status = 'trial' and trial_ends_at > now()))
  ) then raise exception 'Store unavailable'; end if;

  select coalesce(delivery_enabled, false), coalesce(pickup_enabled, true), greatest(coalesce(min_order, 0), 0)
  into v_delivery_enabled, v_pickup_enabled, v_min_order
  from public.tenant_settings where tenant_id = p_tenant_id;
  if not found then
    raise exception 'Store settings unavailable';
  end if;

  select pickup_location into v_pickup_location from public.tenant_settings where tenant_id = p_tenant_id;

  if length(trim(coalesce(p_name, ''))) < 2 or length(trim(p_name)) > 80
    or length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 7
    or length(p_phone) > 30 then raise exception 'Invalid customer'; end if;
  if p_delivery_method not in ('pickup', 'courier') then raise exception 'Invalid delivery method'; end if;
  if p_delivery_method = 'pickup' and not v_pickup_enabled then raise exception 'Pickup unavailable'; end if;
  if p_delivery_method = 'courier' and not v_delivery_enabled then raise exception 'Delivery unavailable'; end if;
  if p_delivery_method = 'courier' and (length(trim(coalesce(p_delivery_address, ''))) < 4 or length(p_delivery_address) > 500) then raise exception 'Invalid delivery address'; end if;
  if p_payment_method <> 'cash' then raise exception 'Payment method unavailable'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'Invalid cart'; end if;

  v_prepared=public.prepare_food_order(p_tenant_id,p_items);
  v_subtotal=(v_prepared->>'subtotal')::integer;
  for v_item in select value from jsonb_array_elements(v_prepared->'stock') loop
    select pv.id,pv.stock_qty into v_variant from public.product_variants pv where pv.id=(v_item->>'variant_id')::uuid and pv.tenant_id=p_tenant_id for update;
    if not found or v_variant.stock_qty<(v_item->>'qty')::integer then raise exception 'Variant unavailable';end if;
  end loop;
  if v_subtotal < v_min_order then raise exception 'Minimum order not reached'; end if;
  if p_delivery_method = 'courier' then
    select id, name, cost, free_from, eta_text into v_zone
    from public.delivery_zones
    where id = p_zone_id and tenant_id = p_tenant_id and is_active;
    if not found then raise exception 'Delivery zone unavailable'; end if;
    v_delivery_cost := case when v_zone.free_from is not null and v_subtotal >= v_zone.free_from then 0 else greatest(v_zone.cost, 0) end;
  end if;

  v_fulfilment_snapshot := jsonb_build_object(
    'version', 1, 'method', p_delivery_method, 'cost', v_delivery_cost,
    'pickup', case when p_delivery_method = 'pickup' then v_pickup_location else null end,
    'address', case when p_delivery_method = 'courier' then trim(p_delivery_address) else null end
  );
  if p_delivery_method = 'courier' then
    v_fulfilment_snapshot := v_fulfilment_snapshot || jsonb_build_object('zone', to_jsonb(v_zone));
  end if;

  insert into public.customers (tenant_id, phone, name, first_order, last_order)
  values (p_tenant_id, trim(p_phone), trim(p_name), now(), now())
  on conflict (tenant_id, phone) do update set name = excluded.name, last_order = now()
  returning id into v_customer_id;

  insert into public.orders (tenant_id, customer_id, source, status, delivery_method, delivery_address, delivery_cost, subtotal, total, payment_method, payment_status, fulfilment_snapshot)
  values (p_tenant_id, v_customer_id, 'online', 'new', p_delivery_method::public.delivery_method, nullif(trim(p_delivery_address), ''), v_delivery_cost, v_subtotal, v_subtotal + v_delivery_cost, p_payment_method::public.payment_method, 'pending', v_fulfilment_snapshot)
  returning id, public.orders.order_number into v_order_id, v_number;

  update public.orders set requested_for=p_requested_for,timing_mode=case when p_requested_for is null then 'asap' else 'scheduled' end where id=v_order_id;
  for v_item in select value from jsonb_array_elements(v_prepared->'lines') loop
    insert into public.order_items(order_id,tenant_id,variant_id,title_snapshot,price_snapshot,qty,options_snapshot,combo_parent)
    values(v_order_id,p_tenant_id,(v_item->>'variant_id')::uuid,v_item->>'title',(v_item->>'price')::integer,(v_item->>'qty')::integer,v_item->'options',(v_item->>'combo_parent')::integer);
  end loop;
  for v_item in select value from jsonb_array_elements(v_prepared->'stock') loop
    insert into public.stock_movements(tenant_id,variant_id,delta,reason,order_id) values(p_tenant_id,(v_item->>'variant_id')::uuid,-(v_item->>'qty')::integer,'sale',v_order_id);
  end loop;
  update public.customers
  set orders_count = orders_count + 1, total_spent = total_spent + v_subtotal
  where id = v_customer_id;

  return query select v_order_id, v_number, v_subtotal + v_delivery_cost;
end;
$function$;

revoke all on function public.create_storefront_order_v3(uuid,text,text,text,text,uuid,text,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.create_storefront_order_v3(uuid,text,text,text,text,uuid,text,jsonb,timestamptz) to service_role;
do $upgrade$
declare definition text;
begin
 select pg_get_functiondef(oid) into definition from pg_proc where proname='create_buyer_order' and pronamespace='public'::regnamespace;
 execute replace(definition,'public.create_storefront_order_v2(','public.create_storefront_order_v3(');
end $upgrade$;

create function public.create_food_product(p_tenant_id uuid,p_title text,p_description text,p_price integer,p_old_price integer,p_category_id uuid,p_images text[],p_is_active boolean,p_variants jsonb,p_food_options jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare product uuid;
begin
 product=public.create_product_with_variants(p_tenant_id,p_title,p_description,p_price,p_old_price,p_category_id,p_images,p_is_active,p_variants);
 update public.products set food_options=p_food_options where id=product and tenant_id=p_tenant_id;
 if not found then raise exception 'Product configuration failed';end if;
 return product;
end $$;
revoke all on function public.create_food_product(uuid,text,text,integer,integer,uuid,text[],boolean,jsonb,jsonb) from public,anon;
grant execute on function public.create_food_product(uuid,text,text,integer,integer,uuid,text[],boolean,jsonb,jsonb) to authenticated;

do $history$
declare definition text;
begin
 select pg_get_functiondef(oid) into definition from pg_proc where proname='buyer_history' and pronamespace='public'::regnamespace;
 execute replace(definition,'''price'',i.price_snapshot','''price'',i.price_snapshot,''options'',i.options_snapshot,''comboParent'',i.combo_parent');
end $history$;
