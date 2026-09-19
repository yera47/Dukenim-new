-- Phone-first buyer identity, merchant SMS configuration/outbox and automatic gifts.
alter table public.buyer_members add column phone text;
alter table public.buyer_members add column legal_accepted_at timestamptz;
alter table public.customers add column user_id uuid references auth.users(id) on delete set null;
alter table public.customers add column marketing_sms_consent boolean not null default false;
alter table public.customers add column marketing_sms_consent_at timestamptz;
create unique index customers_tenant_user_unique on public.customers(tenant_id,user_id) where user_id is not null;

create table public.tenant_sms_settings(
 tenant_id uuid primary key references public.tenants(id) on delete cascade,
 provider text not null default 'mobizon' check(provider in ('mobizon')),
 sender_id text,
 sender_status text not null default 'not_configured' check(sender_status in ('not_configured','pending','approved','rejected')),
 transactional_enabled boolean not null default true,
 marketing_enabled boolean not null default false,
 templates jsonb not null default '{"order_created":"Заказ №{order} принят. Мы сообщим, когда он будет готов.","order_confirmed":"Заказ №{order} подтверждён.","order_ready":"Заказ №{order} готов.","order_done":"Спасибо за заказ №{order}!","order_cancelled":"Заказ №{order} отменён."}',
 updated_at timestamptz not null default now(),
 check(sender_id is null or sender_id ~ '^[A-Za-z0-9]{3,11}$'),
 check(octet_length(templates::text)<=5000)
);
create table public.sms_campaigns(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,
 title text not null check(char_length(title) between 2 and 80),body text not null check(char_length(body) between 2 and 480),
 recipient_count integer not null default 0 check(recipient_count>=0),created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index sms_campaigns_tenant_created on public.sms_campaigns(tenant_id,created_at desc);
create table public.sms_outbox(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,
 customer_id uuid references public.customers(id) on delete set null,order_id uuid references public.orders(id) on delete set null,
 campaign_id uuid references public.sms_campaigns(id) on delete set null,kind text not null,
 recipient text not null check(recipient ~ '^\+?[0-9]{10,15}$'),sender_id text not null,body text not null check(char_length(body) between 2 and 480),
 status text not null default 'pending' check(status in ('pending','processing','sent','failed')),
 attempts integer not null default 0 check(attempts between 0 and 3),deliver_after timestamptz not null default now(),claimed_at timestamptz,sent_at timestamptz,
 provider_message_id text,last_error text,created_at timestamptz not null default now()
);
create index sms_outbox_pending on public.sms_outbox(status,deliver_after,created_at) where status='pending';
create unique index sms_outbox_order_kind on public.sms_outbox(order_id,kind) where order_id is not null;

alter table public.tenant_sms_settings enable row level security;
alter table public.sms_campaigns enable row level security;
alter table public.sms_outbox enable row level security;
revoke all on public.tenant_sms_settings,public.sms_campaigns,public.sms_outbox from anon,authenticated;
grant all on public.tenant_sms_settings,public.sms_campaigns,public.sms_outbox to service_role;
grant select on public.tenant_sms_settings,public.sms_campaigns to authenticated;
create policy sms_settings_owner_select on public.tenant_sms_settings for select to authenticated using(
 exists(select 1 from public.tenant_users u where u.tenant_id=tenant_sms_settings.tenant_id and u.user_id=(select auth.uid()) and u.role='owner') or public.is_superadmin()
);
create policy sms_campaign_owner_select on public.sms_campaigns for select to authenticated using(
 exists(select 1 from public.tenant_users u where u.tenant_id=sms_campaigns.tenant_id and u.user_id=(select auth.uid()) and u.role='owner') or public.is_superadmin()
);

create function public.save_sms_settings(p_tenant uuid,p_sender text,p_transactional boolean,p_marketing boolean,p_templates jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare existing public.tenant_sms_settings; cleaned text=upper(btrim(p_sender));
begin
 if not exists(select 1 from public.tenant_users where tenant_id=p_tenant and user_id=auth.uid() and role='owner') and not public.is_superadmin() then raise exception 'Forbidden';end if;
 if cleaned!~ '^[A-Z0-9]{3,11}$' or jsonb_typeof(p_templates) is distinct from 'object' or octet_length(p_templates::text)>5000 then raise exception 'Invalid SMS settings';end if;
 if exists(select 1 from jsonb_each_text(p_templates) e where e.key not in ('order_created','order_confirmed','order_ready','order_done','order_cancelled') or char_length(e.value) not between 2 and 320) then raise exception 'Invalid SMS template';end if;
 select * into existing from public.tenant_sms_settings where tenant_id=p_tenant;
 insert into public.tenant_sms_settings(tenant_id,sender_id,sender_status,transactional_enabled,marketing_enabled,templates)
 values(p_tenant,cleaned,case when existing.sender_id=cleaned then coalesce(existing.sender_status,'pending') else 'pending' end,p_transactional,p_marketing,p_templates)
 on conflict(tenant_id) do update set sender_id=excluded.sender_id,sender_status=excluded.sender_status,transactional_enabled=excluded.transactional_enabled,marketing_enabled=excluded.marketing_enabled,templates=excluded.templates,updated_at=now();
 insert into public.platform_audit_events(actor_id,tenant_id,action,metadata) values(auth.uid(),p_tenant,'sms.settings_saved',jsonb_build_object('sender_id',cleaned,'marketing',p_marketing));
 return true;
end $$;
revoke all on function public.save_sms_settings(uuid,text,boolean,boolean,jsonb) from public,anon;
grant execute on function public.save_sms_settings(uuid,text,boolean,boolean,jsonb) to authenticated;

create function public.queue_sms_campaign(p_tenant uuid,p_title text,p_body text) returns integer
language plpgsql security definer set search_path='' as $$
declare settings public.tenant_sms_settings; campaign uuid; queued integer;
begin
 if not exists(select 1 from public.tenant_users where tenant_id=p_tenant and user_id=auth.uid() and role='owner') and not public.is_superadmin() then raise exception 'Forbidden';end if;
 if char_length(btrim(p_title)) not between 2 and 80 or char_length(btrim(p_body)) not between 2 and 480 then raise exception 'Invalid campaign';end if;
 select * into settings from public.tenant_sms_settings where tenant_id=p_tenant for update;
 if not found or not settings.marketing_enabled or settings.sender_status<>'approved' then raise exception 'SMS sender unavailable';end if;
 insert into public.sms_campaigns(tenant_id,title,body,created_by) values(p_tenant,btrim(p_title),btrim(p_body),auth.uid()) returning id into campaign;
 insert into public.sms_outbox(tenant_id,customer_id,campaign_id,kind,recipient,sender_id,body)
 select p_tenant,c.id,campaign,'marketing',regexp_replace(c.phone,'[^0-9+]','','g'),settings.sender_id,btrim(p_body)
 from public.customers c where c.tenant_id=p_tenant and c.marketing_sms_consent and c.phone is not null;
 get diagnostics queued=row_count;update public.sms_campaigns set recipient_count=queued where id=campaign;
 insert into public.platform_audit_events(actor_id,tenant_id,action,metadata) values(auth.uid(),p_tenant,'sms.campaign_queued',jsonb_build_object('campaign_id',campaign,'recipients',queued));
 return queued;
end $$;
revoke all on function public.queue_sms_campaign(uuid,text,text) from public,anon;
grant execute on function public.queue_sms_campaign(uuid,text,text) to authenticated;

create function public.queue_order_sms() returns trigger language plpgsql security definer set search_path='' as $$
declare settings public.tenant_sms_settings; recipient text; template text; event_kind text;
begin
 select * into settings from public.tenant_sms_settings where tenant_id=new.tenant_id;
 if not found or not settings.transactional_enabled or settings.sender_status<>'approved' then return new;end if;
 if tg_op='INSERT' then event_kind='order_created';
 elsif new.status=old.status then return new;
 elsif new.status='confirmed' then event_kind='order_confirmed';
 elsif new.status='assembled' then event_kind='order_ready';
 elsif new.status='done' then event_kind='order_done';
 elsif new.status='cancelled' then event_kind='order_cancelled';else return new;end if;
 select regexp_replace(c.phone,'[^0-9+]','','g') into recipient from public.customers c where c.id=new.customer_id and c.tenant_id=new.tenant_id;
 template=settings.templates->>event_kind;if recipient is null or template is null then return new;end if;
 insert into public.sms_outbox(tenant_id,customer_id,order_id,kind,recipient,sender_id,body)
 values(new.tenant_id,new.customer_id,new.id,event_kind,recipient,settings.sender_id,replace(template,'{order}',new.order_number::text)) on conflict do nothing;
 return new;
end $$;
revoke all on function public.queue_order_sms() from public,anon,authenticated;
create trigger queue_order_sms_created after insert on public.orders for each row execute function public.queue_order_sms();
create trigger queue_order_sms_status after update of status on public.orders for each row execute function public.queue_order_sms();

create function public.attach_buyer_customer() returns trigger language plpgsql security definer set search_path='' as $$
declare customer uuid;phone_value text;
begin
 if new.user_id is null then return new;end if;
 select o.customer_id into customer from public.orders o where o.id=new.order_id and o.tenant_id=new.tenant_id;
 select c.phone into phone_value from public.customers c where c.id=customer and c.tenant_id=new.tenant_id;
 insert into public.buyer_members(tenant_id,user_id,phone,legal_accepted_at) values(new.tenant_id,new.user_id,phone_value,now())
 on conflict(tenant_id,user_id) do update set phone=excluded.phone,legal_accepted_at=coalesce(buyer_members.legal_accepted_at,excluded.legal_accepted_at);
 update public.customers set user_id=new.user_id where id=customer and tenant_id=new.tenant_id and (user_id is null or user_id=new.user_id);
 return new;
end $$;
revoke all on function public.attach_buyer_customer() from public,anon,authenticated;
create trigger attach_buyer_customer after insert or update of user_id on public.buyer_order_access for each row execute function public.attach_buyer_customer();

create function public.set_buyer_marketing_consent(p_tenant uuid,p_user uuid,p_enabled boolean) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if p_user is null or auth.uid() is distinct from p_user then raise exception 'Forbidden';end if;
 update public.customers set marketing_sms_consent=p_enabled,marketing_sms_consent_at=case when p_enabled then now() else null end where tenant_id=p_tenant and user_id=p_user;
 return found;
end $$;
revoke all on function public.set_buyer_marketing_consent(uuid,uuid,boolean) from public,anon;
grant execute on function public.set_buyer_marketing_consent(uuid,uuid,boolean) to authenticated;

create function public.add_automatic_loyalty_gift() returns trigger language plpgsql security definer set search_path='' as $$
declare variant uuid;tenant uuid;gift record;
begin
 select (r.config->>'giftVariantId')::uuid,r.tenant_id into variant,tenant from public.loyalty_rules r where r.id=new.rule_id and r.config->>'reward'='gift' and nullif(r.config->>'giftVariantId','') is not null;
 if variant is null then return new;end if;
 select v.id,v.stock_qty,p.title into gift from public.product_variants v join public.products p on p.id=v.product_id and p.tenant_id=v.tenant_id where v.id=variant and v.tenant_id=tenant and v.is_active and p.is_active for update of v;
 if not found or gift.stock_qty<1 then raise exception 'Gift unavailable';end if;
 insert into public.order_items(order_id,tenant_id,variant_id,title_snapshot,price_snapshot,qty,options_snapshot) values(new.order_id,tenant,variant,gift.title,0,1,'["Подарок по карте лояльности"]');
 insert into public.stock_movements(tenant_id,variant_id,delta,reason,order_id) values(tenant,variant,-1,'sale',new.order_id);
 return new;
end $$;
revoke all on function public.add_automatic_loyalty_gift() from public,anon,authenticated;
create trigger add_automatic_loyalty_gift after insert on public.loyalty_redemptions for each row execute function public.add_automatic_loyalty_gift();

-- Owners can link a gift only to an active variant from the same tenant.
create or replace function public.validate_loyalty_gift_rule() returns trigger language plpgsql security definer set search_path='' as $$
declare variant uuid;
begin
 if new.config->>'reward'<>'gift' then return new;end if;
 variant=nullif(new.config->>'giftVariantId','')::uuid;
 if variant is not null and not exists(select 1 from public.product_variants v join public.products p on p.id=v.product_id where v.id=variant and v.tenant_id=new.tenant_id and p.tenant_id=new.tenant_id and v.is_active and p.is_active) then raise exception 'Gift variant unavailable';end if;
 return new;
end $$;
revoke all on function public.validate_loyalty_gift_rule() from public,anon,authenticated;
create trigger validate_loyalty_gift_rule before insert or update of config on public.loyalty_rules for each row execute function public.validate_loyalty_gift_rule();

-- Raw ingredient warehouse. Product stock remains in stock_movements; recipes
-- consume a separate auditable material ledger.
create table public.food_materials(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,
 name text not null check(char_length(name) between 1 and 80),unit text not null check(unit in ('g','kg','ml','l','pcs')),
 stock_qty numeric(14,3) not null default 0 check(stock_qty>=0),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(tenant_id,name)
);
create table public.food_recipe_items(
 product_id uuid not null references public.products(id) on delete cascade,material_id uuid not null references public.food_materials(id) on delete restrict,
 tenant_id uuid not null references public.tenants(id) on delete cascade,amount numeric(12,3) not null check(amount>0),primary key(product_id,material_id)
);
create table public.food_material_movements(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,
 material_id uuid not null references public.food_materials(id) on delete restrict,delta numeric(14,3) not null check(delta<>0),
 reason text not null check(reason in ('restock','writeoff','correction','sale','return')),order_id uuid references public.orders(id) on delete set null,
 staff_id uuid references auth.users(id) on delete set null,created_at timestamptz not null default now()
);
create index food_material_movements_material on public.food_material_movements(tenant_id,material_id,created_at desc);
alter table public.food_materials enable row level security;alter table public.food_recipe_items enable row level security;alter table public.food_material_movements enable row level security;
revoke all on public.food_materials,public.food_recipe_items,public.food_material_movements from anon,authenticated;
grant all on public.food_materials,public.food_recipe_items,public.food_material_movements to service_role;
grant select on public.food_materials,public.food_recipe_items,public.food_material_movements to authenticated;
create policy food_material_owner on public.food_materials for select to authenticated using(exists(select 1 from public.tenant_users u where u.tenant_id=food_materials.tenant_id and u.user_id=(select auth.uid()) and u.role='owner') or public.is_superadmin());
create policy food_recipe_owner on public.food_recipe_items for select to authenticated using(exists(select 1 from public.tenant_users u where u.tenant_id=food_recipe_items.tenant_id and u.user_id=(select auth.uid()) and u.role='owner') or public.is_superadmin());
create policy food_material_movement_owner on public.food_material_movements for select to authenticated using(exists(select 1 from public.tenant_users u where u.tenant_id=food_material_movements.tenant_id and u.user_id=(select auth.uid()) and u.role='owner') or public.is_superadmin());

create function public.apply_food_material_movement() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.food_materials set stock_qty=stock_qty+new.delta,updated_at=now() where id=new.material_id and tenant_id=new.tenant_id and stock_qty+new.delta>=0;if not found then raise exception 'Insufficient material stock';end if;return new;end $$;
revoke all on function public.apply_food_material_movement() from public,anon,authenticated;
create trigger apply_food_material_movement after insert on public.food_material_movements for each row execute function public.apply_food_material_movement();
create function public.guard_food_material_stock() returns trigger language plpgsql set search_path='' as $$begin if new.stock_qty<>old.stock_qty and pg_trigger_depth()<2 then raise exception 'Material stock may only change through movements';end if;return new;end$$;
revoke all on function public.guard_food_material_stock() from public,anon,authenticated;
create trigger guard_food_material_stock before update of stock_qty on public.food_materials for each row execute function public.guard_food_material_stock();

create function public.owner_save_food_material(p_tenant uuid,p_id uuid,p_name text,p_unit text,p_stock numeric) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;current_stock numeric;
begin if not exists(select 1 from public.tenant_users where tenant_id=p_tenant and user_id=auth.uid() and role='owner') and not public.is_superadmin() then raise exception 'Forbidden';end if;if char_length(btrim(p_name)) not between 1 and 80 or p_unit not in ('g','kg','ml','l','pcs') or p_stock<0 or p_stock>100000000 then raise exception 'Invalid material';end if;
 if p_id is null then insert into public.food_materials(tenant_id,name,unit) values(p_tenant,btrim(p_name),p_unit) returning id,stock_qty into result,current_stock;else update public.food_materials set name=btrim(p_name),unit=p_unit,updated_at=now() where id=p_id and tenant_id=p_tenant returning id,stock_qty into result,current_stock;if not found then raise exception 'Material not found';end if;end if;
 if p_stock<>current_stock then insert into public.food_material_movements(tenant_id,material_id,delta,reason,staff_id) values(p_tenant,result,p_stock-current_stock,'correction',auth.uid());end if;return result;end $$;
revoke all on function public.owner_save_food_material(uuid,uuid,text,text,numeric) from public,anon;grant execute on function public.owner_save_food_material(uuid,uuid,text,text,numeric) to authenticated;

create function public.owner_save_food_recipe(p_tenant uuid,p_product uuid,p_recipe jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare item jsonb;ids uuid[]='{}';material uuid;
begin if not exists(select 1 from public.tenant_users where tenant_id=p_tenant and user_id=auth.uid() and role='owner') and not public.is_superadmin() then raise exception 'Forbidden';end if;if not exists(select 1 from public.products where id=p_product and tenant_id=p_tenant) or jsonb_typeof(p_recipe) is distinct from 'array' or jsonb_array_length(p_recipe)>40 then raise exception 'Invalid recipe';end if;
 delete from public.food_recipe_items where tenant_id=p_tenant and product_id=p_product;
 for item in select value from jsonb_array_elements(p_recipe) loop material=(item->>'materialId')::uuid;if material=any(ids) or coalesce((item->>'amount')::numeric,0)<=0 or coalesce((item->>'amount')::numeric,0)>1000000 or not exists(select 1 from public.food_materials where id=material and tenant_id=p_tenant) then raise exception 'Invalid recipe item';end if;insert into public.food_recipe_items(product_id,material_id,tenant_id,amount) values(p_product,material,p_tenant,(item->>'amount')::numeric);ids=array_append(ids,material);end loop;return true;end $$;
revoke all on function public.owner_save_food_recipe(uuid,uuid,jsonb) from public,anon;grant execute on function public.owner_save_food_recipe(uuid,uuid,jsonb) to authenticated;

create function public.consume_food_recipe() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.food_material_movements(tenant_id,material_id,delta,reason,order_id)
 select new.tenant_id,r.material_id,-r.amount*new.qty,'sale',new.order_id from public.product_variants v join public.food_recipe_items r on r.product_id=v.product_id and r.tenant_id=v.tenant_id join public.food_materials m on m.id=r.material_id and m.tenant_id=r.tenant_id where v.id=new.variant_id and v.tenant_id=new.tenant_id and not exists(select 1 from jsonb_array_elements_text(coalesce(new.options_snapshot,'[]')) option where lower(option)=lower('Без '||m.name)) order by r.material_id;return new;end $$;
revoke all on function public.consume_food_recipe() from public,anon,authenticated;create trigger consume_food_recipe after insert on public.order_items for each row execute function public.consume_food_recipe();
create function public.return_cancelled_food_materials() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.status='cancelled' and old.status<>'cancelled' then insert into public.food_material_movements(tenant_id,material_id,delta,reason,order_id) select new.tenant_id,material_id,-sum(delta),'return',new.id from public.food_material_movements where order_id=new.id and tenant_id=new.tenant_id and reason in ('sale','return') group by material_id having sum(delta)<0 order by material_id;end if;return new;end $$;
revoke all on function public.return_cancelled_food_materials() from public,anon,authenticated;create trigger return_cancelled_food_materials after update of status on public.orders for each row execute function public.return_cancelled_food_materials();
