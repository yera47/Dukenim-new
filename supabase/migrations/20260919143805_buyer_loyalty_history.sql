-- Buyer ownership is verified by an authenticated account or a random receipt cookie.
-- Loyalty rules are immutable versions; money and rewards are calculated only in SQL.
create table public.loyalty_programs (
 tenant_id uuid primary key references public.tenants(id) on delete cascade,
 name text not null check(char_length(name) between 2 and 60),
 enabled boolean not null default true,
 terms text not null default '' check(char_length(terms)<=1200),
 updated_at timestamptz not null default now()
);
create table public.loyalty_rules (
 id uuid primary key, tenant_id uuid not null references public.tenants(id) on delete cascade,
 config jsonb not null, active boolean not null default true, created_at timestamptz not null default now()
);
create index loyalty_rules_tenant on public.loyalty_rules(tenant_id);
create table public.buyer_members (
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete restrict,
 referral_code uuid not null default gen_random_uuid() unique,
 primary key(tenant_id,user_id)
);
create table public.buyer_referrals (
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete restrict,
 referrer_id uuid not null references auth.users(id) on delete restrict,
 primary key(tenant_id,user_id), check(user_id<>referrer_id)
);
create index buyer_referrals_referrer on public.buyer_referrals(tenant_id,referrer_id);
create table public.buyer_order_access (
 order_id uuid primary key references public.orders(id) on delete cascade,
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 user_id uuid references auth.users(id) on delete restrict,
 guest_hash text not null check(guest_hash ~ '^[a-f0-9]{64}$'),
 referral_code uuid, discount integer not null default 0 check(discount>=0),
 reward_label text, completed_at timestamptz, created_at timestamptz not null default now()
);
create index buyer_order_account on public.buyer_order_access(tenant_id,user_id);
create index buyer_order_guest on public.buyer_order_access(tenant_id,guest_hash);
create table public.loyalty_events (
 order_id uuid not null references public.orders(id) on delete cascade,
 rule_id uuid not null references public.loyalty_rules(id) on delete restrict,
 units bigint not null check(units>=0), primary key(order_id,rule_id)
);
create index loyalty_events_rule on public.loyalty_events(rule_id);
create table public.loyalty_redemptions (
 rule_id uuid not null references public.loyalty_rules(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete restrict,
 milestone integer not null check(milestone>0),
 order_id uuid not null references public.orders(id) on delete cascade,
 cancelled boolean not null default false,
 primary key(rule_id,user_id,milestone)
);
create index loyalty_redemptions_order on public.loyalty_redemptions(order_id);
alter table public.loyalty_programs enable row level security;
alter table public.loyalty_rules enable row level security;
alter table public.buyer_members enable row level security;
alter table public.buyer_referrals enable row level security;
alter table public.buyer_order_access enable row level security;
alter table public.loyalty_events enable row level security;
alter table public.loyalty_redemptions enable row level security;
revoke all on public.loyalty_programs,public.loyalty_rules,public.buyer_members,public.buyer_referrals,public.buyer_order_access,public.loyalty_events,public.loyalty_redemptions from anon,authenticated;
grant all on public.loyalty_programs,public.loyalty_rules,public.buyer_members,public.buyer_referrals,public.buyer_order_access,public.loyalty_events,public.loyalty_redemptions to service_role;
grant select on public.loyalty_programs,public.loyalty_rules to authenticated;
create policy loyalty_program_owner on public.loyalty_programs for select to authenticated using(exists(select 1 from public.tenant_users u where u.tenant_id=loyalty_programs.tenant_id and u.user_id=(select auth.uid()) and u.role='owner') or public.is_superadmin());
create policy loyalty_rule_owner on public.loyalty_rules for select to authenticated using(exists(select 1 from public.tenant_users u where u.tenant_id=loyalty_rules.tenant_id and u.user_id=(select auth.uid()) and u.role='owner') or public.is_superadmin());

create function public.save_loyalty_program(p_tenant_id uuid,p_program jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare r jsonb; rid uuid; old_config jsonb; old_tenant uuid; ids uuid[]='{}';
begin
 if not exists(select 1 from public.tenant_users where tenant_id=p_tenant_id and user_id=auth.uid() and role='owner') and not public.is_superadmin() then raise exception 'Forbidden'; end if;
 perform 1 from public.tenants where id=p_tenant_id and business_vertical='food' for update;
 if not found then raise exception 'Food loyalty only'; end if;
 if jsonb_typeof(p_program->'enabled') is distinct from 'boolean' or jsonb_typeof(p_program->'rules') is distinct from 'array' then raise exception 'Invalid program'; end if;
 if jsonb_array_length(p_program->'rules') not between 1 and 8 then raise exception 'Invalid rules'; end if;
 insert into public.loyalty_programs(tenant_id,name,enabled,terms) values(p_tenant_id,p_program->>'name',(p_program->>'enabled')::boolean,coalesce(p_program->>'terms',''))
 on conflict(tenant_id) do update set name=excluded.name,enabled=excluded.enabled,terms=excluded.terms,updated_at=now();
 update public.loyalty_rules set active=false where tenant_id=p_tenant_id;
 for r in select value from jsonb_array_elements(p_program->'rules') loop
  rid=(r->>'id')::uuid;
  if rid is null or rid=any(ids) or coalesce(r->>'trigger','') not in ('orders','product','spend','referral') or coalesce(r->>'reward','') not in ('gift','percent','fixed','cashback') then raise exception 'Invalid rule'; end if;
  if coalesce((r->>'threshold')::integer,0) not between 1 and 10000000 or coalesce((r->>'value')::integer,0) not between 1 and 10000000
    or coalesce((r->>'minOrder')::integer,-1) not between 0 and 999999999 or coalesce((r->>'expiryDays')::integer,-1) not between 0 and 365
    or coalesce(char_length(r->>'label'),0) not between 2 and 100 or coalesce(char_length(r->>'category'),999) >80
    or jsonb_typeof(r->'repeat') is distinct from 'boolean' or jsonb_typeof(r->'earnOnReward') is distinct from 'boolean' then raise exception 'Invalid condition'; end if;
  if r->>'trigger'='product' and length(btrim(r->>'category'))=0 then raise exception 'Category required'; end if;
  if r->>'reward' in ('percent','cashback') and (r->>'value')::integer>100 then raise exception 'Invalid percent'; end if;
  if r->>'reward'='cashback' and (r->>'trigger'<>'orders' or (r->>'threshold')::integer<>1) then raise exception 'Invalid cashback'; end if;
  select config,tenant_id into old_config,old_tenant from public.loyalty_rules where id=rid;
  if found and (old_tenant<>p_tenant_id or old_config<>r) then raise exception 'Changed rule requires new id'; end if;
  insert into public.loyalty_rules(id,tenant_id,config) values(rid,p_tenant_id,r) on conflict(id) do update set active=true;
  ids=array_append(ids,rid);
 end loop;
 return true;
end $$;
revoke all on function public.save_loyalty_program(uuid,jsonb) from public,anon;
grant execute on function public.save_loyalty_program(uuid,jsonb) to authenticated;

create function public.loyalty_qualifications(p_rule uuid,p_user uuid)
returns table(units bigint,amount integer,unlocked_at timestamptz,event_id uuid)
language sql stable security definer set search_path='' as $$
 with candidates as (
 select e.units,greatest(o.subtotal-a.discount,0) amount,coalesce(a.completed_at,o.created_at) unlocked_at,o.id event_id,
 r.config->>'trigger' kind,row_number() over(partition by a.user_id order by a.created_at,o.id) friend_order
 from public.loyalty_rules r join public.loyalty_events e on e.rule_id=r.id
 join public.orders o on o.id=e.order_id and o.tenant_id=r.tenant_id
 join public.buyer_order_access a on a.order_id=o.id and a.tenant_id=r.tenant_id
 where r.id=p_rule and o.status='done' and o.payment_status='paid'
 and ((r.config->>'trigger'<>'referral' and a.user_id=p_user)
 or (r.config->>'trigger'='referral' and exists(select 1 from public.buyer_referrals f where f.tenant_id=r.tenant_id and f.user_id=a.user_id and f.referrer_id=p_user)))
 ) select units,amount,unlocked_at,event_id from candidates where kind<>'referral' or friend_order=1;
$$;
revoke all on function public.loyalty_qualifications(uuid,uuid) from public,anon,authenticated;
grant execute on function public.loyalty_qualifications(uuid,uuid) to service_role;

create function public.loyalty_rule_progress(p_rule uuid,p_user uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r public.loyalty_rules; total_units bigint; earned integer; candidate integer; unlocked timestamptz; amount integer; reward_value integer; available jsonb=null;
begin
 select * into r from public.loyalty_rules where id=p_rule;
 select coalesce(sum(q.units),0) into total_units from public.loyalty_qualifications(p_rule,p_user) q;
 earned=least(total_units/(r.config->>'threshold')::integer,2147483647)::integer;
 if not (r.config->>'repeat')::boolean then earned=least(earned,1); end if;
 -- All consumed milestones are indexed; expiry is checked against the actual qualifying purchase.
 for candidate in select n from generate_series(1,earned) n where not exists(select 1 from public.loyalty_redemptions d where d.rule_id=p_rule and d.user_id=p_user and d.milestone=n and not d.cancelled) order by n loop
  select q.unlocked_at,q.amount into unlocked,amount from (
   select x.*,sum(x.units) over(order by x.unlocked_at,x.event_id) cumulative from public.loyalty_qualifications(p_rule,p_user) x
  ) q where q.cumulative>=candidate::bigint*(r.config->>'threshold')::integer order by q.unlocked_at,q.event_id limit 1;
  if (r.config->>'expiryDays')::integer>0 and unlocked+make_interval(days=>(r.config->>'expiryDays')::integer)<=now() then continue; end if;
  reward_value=case when r.config->>'reward'='cashback' then floor(amount::numeric*(r.config->>'value')::integer/100)::integer else (r.config->>'value')::integer end;
  if reward_value=0 then continue; end if;
  available=jsonb_build_object('ruleId',p_rule,'milestone',candidate,'reward',r.config->>'reward','label',r.config->>'label','value',reward_value,'expiresAt',case when (r.config->>'expiryDays')::integer>0 then unlocked+make_interval(days=>(r.config->>'expiryDays')::integer) else null end);
  exit;
 end loop;
 return jsonb_build_object('rule',r.config,'active',r.active,'progress',total_units,'available',available);
end $$;
revoke all on function public.loyalty_rule_progress(uuid,uuid) from public,anon,authenticated;
grant execute on function public.loyalty_rule_progress(uuid,uuid) to service_role;

create function public.trigger_order_loyalty() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='done' and new.payment_status='paid' then update public.buyer_order_access set completed_at=coalesce(completed_at,now()) where order_id=new.id; end if;
 if new.status='cancelled' or new.payment_status='refunded' then update public.loyalty_redemptions set cancelled=true where order_id=new.id; end if;
 return new;
end $$;
revoke all on function public.trigger_order_loyalty() from public,anon,authenticated;
create trigger order_loyalty_settlement after update of status,payment_status on public.orders for each row execute function public.trigger_order_loyalty();

create function public.claim_buyer_orders(p_tenant uuid,p_user uuid,p_guest_hash text,p_receipts uuid[]) returns integer
language plpgsql security definer set search_path='' as $$
declare claimed integer=0; code uuid; referrer uuid;
begin
 if p_guest_hash is null or p_guest_hash !~ '^[a-f0-9]{64}$' or coalesce(cardinality(p_receipts),0)>20 then raise exception 'Invalid receipt'; end if;
 insert into public.buyer_order_access(order_id,tenant_id,guest_hash) select id,tenant_id,p_guest_hash from public.orders where tenant_id=p_tenant and id=any(p_receipts) on conflict(order_id) do nothing;
 if p_user is null then return 0; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||p_user::text,0));
 insert into public.buyer_members(tenant_id,user_id) values(p_tenant,p_user) on conflict do nothing;
 if not exists(select 1 from public.buyer_order_access where tenant_id=p_tenant and user_id=p_user) then
  select referral_code into code from public.buyer_order_access where tenant_id=p_tenant and user_id is null and guest_hash=p_guest_hash and referral_code is not null order by created_at limit 1;
  select user_id into referrer from public.buyer_members where tenant_id=p_tenant and referral_code=code and user_id<>p_user;
  if referrer is not null then insert into public.buyer_referrals values(p_tenant,p_user,referrer) on conflict do nothing; end if;
 end if;
 update public.buyer_order_access set user_id=p_user where tenant_id=p_tenant and user_id is null and (guest_hash=p_guest_hash or order_id=any(p_receipts));
 get diagnostics claimed=row_count;
 return claimed;
end $$;
revoke all on function public.claim_buyer_orders(uuid,uuid,text,uuid[]) from public,anon,authenticated;
grant execute on function public.claim_buyer_orders(uuid,uuid,text,uuid[]) to service_role;

create function public.create_buyer_order(p_tenant_id uuid,p_name text,p_phone text,p_delivery_method text,p_delivery_address text,p_zone_id uuid,p_payment_method text,p_items jsonb,p_requested_for timestamptz,p_user uuid,p_guest_hash text,p_reward_rule uuid default null,p_reward_milestone integer default null,p_referral_code uuid default null)
returns table(order_id uuid,order_number integer,total integer)
language plpgsql security definer set search_path='' as $$
declare created record; reward jsonb; discount_value integer=0; label text; subtotal_value integer; config jsonb; rule record; earned_units bigint; referrer uuid;
begin
 if p_guest_hash is null or p_guest_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid buyer'; end if;
 if p_user is not null then
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text||p_user::text,0));
  insert into public.buyer_members(tenant_id,user_id) values(p_tenant_id,p_user) on conflict do nothing;
  if not exists(select 1 from public.buyer_order_access where tenant_id=p_tenant_id and user_id=p_user) then
   select user_id into referrer from public.buyer_members where tenant_id=p_tenant_id and referral_code=p_referral_code and user_id<>p_user;
   if referrer is not null then insert into public.buyer_referrals values(p_tenant_id,p_user,referrer) on conflict do nothing; end if;
  end if;
 end if;
 if p_reward_rule is not null then
  if p_user is null then raise exception 'Sign in for reward'; end if;
  select r.config into config from public.loyalty_rules r where r.id=p_reward_rule and r.tenant_id=p_tenant_id;
  if not found then raise exception 'Reward unavailable'; end if;
  reward=public.loyalty_rule_progress(p_reward_rule,p_user)->'available';
  if reward is null or reward='null'::jsonb or (reward->>'milestone')::integer is distinct from p_reward_milestone then raise exception 'Reward unavailable'; end if;
 end if;
 select * into created from public.create_storefront_order_v2(p_tenant_id,p_name,p_phone,p_delivery_method,p_delivery_address,p_zone_id,p_payment_method,p_items,p_requested_for);
 select o.subtotal into subtotal_value from public.orders o where o.id=created.order_id;
 if p_reward_rule is not null then
  if subtotal_value<(config->>'minOrder')::integer then raise exception 'Reward minimum order'; end if;
  discount_value=case reward->>'reward' when 'percent' then floor(subtotal_value::numeric*(reward->>'value')::integer/100)::integer when 'fixed' then least(subtotal_value,(reward->>'value')::integer) when 'cashback' then least(subtotal_value,(reward->>'value')::integer) else 0 end;
  label=reward->>'label';
  insert into public.loyalty_redemptions(rule_id,user_id,milestone,order_id) values(p_reward_rule,p_user,p_reward_milestone,created.order_id)
  on conflict(rule_id,user_id,milestone) do update set order_id=excluded.order_id,cancelled=false where loyalty_redemptions.cancelled;
  if not found then raise exception 'Reward already used'; end if;
  update public.orders o set total=o.total-discount_value where o.id=created.order_id;
 end if;
 insert into public.buyer_order_access(order_id,tenant_id,user_id,guest_hash,referral_code,discount,reward_label) values(created.order_id,p_tenant_id,p_user,p_guest_hash,p_referral_code,discount_value,label);
 for rule in select r.* from public.loyalty_rules r join public.loyalty_programs p on p.tenant_id=r.tenant_id where r.tenant_id=p_tenant_id and r.active and p.enabled loop
  config=rule.config;
  if subtotal_value-discount_value<=0 or subtotal_value-discount_value<(config->>'minOrder')::integer or (p_reward_rule is not null and not (config->>'earnOnReward')::boolean) then continue; end if;
  if config->>'trigger'='spend' then earned_units=subtotal_value-discount_value;
  elsif config->>'trigger'='product' then
   select coalesce(sum(i.qty),0) into earned_units from public.order_items i join public.product_variants v on v.id=i.variant_id join public.products p on p.id=v.product_id join public.categories c on c.id=p.category_id where i.order_id=created.order_id and lower(btrim(c.name))=lower(btrim(config->>'category'));
  else earned_units=1; end if;
  if earned_units>0 then insert into public.loyalty_events values(created.order_id,rule.id,earned_units); end if;
 end loop;
 return query select created.order_id::uuid,created.order_number::integer,(created.total-discount_value)::integer;
end $$;
revoke all on function public.create_buyer_order(uuid,text,text,text,text,uuid,text,jsonb,timestamptz,uuid,text,uuid,integer,uuid) from public,anon,authenticated;
grant execute on function public.create_buyer_order(uuid,text,text,text,text,uuid,text,jsonb,timestamptz,uuid,text,uuid,integer,uuid) to service_role;

create function public.buyer_history(p_tenant uuid,p_user uuid,p_guest_hash text,p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare history jsonb; program jsonb; progress jsonb; code uuid;
begin
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id desc),'[]') into history from (
  select o.id,o.order_number,o.status,o.payment_status,o.total,o.delivery_method,o.requested_for,o.fulfilment_snapshot,o.created_at,a.discount loyalty_discount,a.reward_label,
  (select jsonb_build_object('status',r.status,'expires_at',r.expires_at) from public.merchandise_reservations r where r.order_id=o.id) reservation,
  (select coalesce(jsonb_agg(jsonb_build_object('title',i.title_snapshot,'qty',i.qty,'price',i.price_snapshot)),'[]') from public.order_items i where i.order_id=o.id) items
  from public.orders o join public.buyer_order_access a on a.order_id=o.id
  where o.tenant_id=p_tenant and a.tenant_id=p_tenant and ((p_user is not null and a.user_id=p_user) or (a.user_id is null and a.guest_hash=p_guest_hash))
  order by o.created_at desc,o.id desc limit 21 offset greatest(0,least(p_offset,1000000))
 ) q;
 select jsonb_build_object('name',p.name,'enabled',p.enabled,'terms',p.terms) into program from public.loyalty_programs p where p.tenant_id=p_tenant;
 select coalesce(jsonb_agg(public.loyalty_rule_progress(r.id,p_user) order by r.created_at,r.id),'[]') into progress from public.loyalty_rules r where r.tenant_id=p_tenant and (r.active or exists(select 1 from public.loyalty_qualifications(r.id,p_user)));
 select referral_code into code from public.buyer_members where tenant_id=p_tenant and user_id=p_user;
 return jsonb_build_object('orders',history,'program',program,'rules',progress,'referralCode',code);
end $$;
revoke all on function public.buyer_history(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.buyer_history(uuid,uuid,text,integer) to service_role;

create function public.owner_confirm_cash(p_order uuid,p_refund boolean default false) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 update public.orders o set payment_status=case when p_refund then 'refunded'::public.payment_status else 'paid'::public.payment_status end
 where o.id=p_order and o.payment_method='cash' and ((p_refund and o.payment_status='paid') or (not p_refund and o.payment_status='pending' and o.status<>'cancelled'))
 and exists(select 1 from public.tenant_users u where u.tenant_id=o.tenant_id and u.user_id=auth.uid() and u.role='owner');
 if not found then raise exception 'Payment transition unavailable'; end if;
 return true;
end $$;
revoke all on function public.owner_confirm_cash(uuid,boolean) from public,anon;
grant execute on function public.owner_confirm_cash(uuid,boolean) to authenticated;

create function public.create_catalog_setup_with_loyalty(p_tenant_id uuid,p_name text,p_template text,p_palette text,p_generation_id uuid,p_color_theme jsonb,p_fulfilment jsonb,p_payment_preference text,p_loyalty jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
 if exists(select 1 from public.tenants where id=p_tenant_id and business_vertical='food') then
  if p_loyalty is null or (p_loyalty->>'enabled')::boolean is distinct from true then raise exception 'Configure loyalty'; end if;
  perform public.save_loyalty_program(p_tenant_id,p_loyalty);
 end if;
 result=public.create_catalog_setup(p_tenant_id,p_name,p_template,p_palette,p_generation_id,p_color_theme,p_fulfilment,p_payment_preference);
 return result;
end $$;
revoke all on function public.create_catalog_setup_with_loyalty(uuid,text,text,text,uuid,jsonb,jsonb,text,jsonb) from public,anon;
grant execute on function public.create_catalog_setup_with_loyalty(uuid,text,text,text,uuid,jsonb,jsonb,text,jsonb) to authenticated;
