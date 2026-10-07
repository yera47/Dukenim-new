-- DRAFT ONLY: local review/tests. Never applied to production in this task.
-- Product credits are integer accounting units, not provider tokens or currency.

create table public.ai_product_credit_accounts (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  allowance_balance integer not null default 0 check (allowance_balance >= 0),
  allowance_period_ends_at timestamptz,
  purchased_balance integer not null default 0 check (purchased_balance >= 0),
  premium_trial_job_started_at timestamptz,
  premium_trial_job_consumed_at timestamptz,
  premium_trial_reservation_id uuid,
  reserved_allowance integer not null default 0 check (reserved_allowance >= 0 and reserved_allowance <= allowance_balance),
  reserved_purchased integer not null default 0 check (reserved_purchased >= 0 and reserved_purchased <= purchased_balance),
  tenant_credit_cap integer not null default 0 check (tenant_credit_cap >= 0),
  tenant_usd_micros_cap bigint not null default 0 check (tenant_usd_micros_cap >= 0),
  spent_usd_micros bigint not null default 0 check (spent_usd_micros >= 0 and spent_usd_micros <= tenant_usd_micros_cap),
  reserved_usd_micros bigint not null default 0 check (reserved_usd_micros >= 0 and spent_usd_micros + reserved_usd_micros <= tenant_usd_micros_cap),
  alert_at_percent smallint not null default 80 check (alert_at_percent between 1 and 100),
  generation_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.ai_product_credit_platform_control (
  singleton boolean primary key default true check (singleton),
  kill_switch boolean not null default true,
  owner_usd_micros_cap bigint not null default 0 check (owner_usd_micros_cap >= 0),
  spent_usd_micros bigint not null default 0 check (spent_usd_micros >= 0 and spent_usd_micros <= owner_usd_micros_cap),
  reserved_usd_micros bigint not null default 0 check (reserved_usd_micros >= 0 and spent_usd_micros + reserved_usd_micros <= owner_usd_micros_cap),
  updated_at timestamptz not null default now()
);

create table public.ai_product_credit_price_rules (
  id uuid primary key default gen_random_uuid(),
  model text not null,
  resolution text not null,
  reference_mp_min numeric(8,2) not null check (reference_mp_min >= 0),
  reference_mp_max numeric(8,2) not null check (reference_mp_max >= reference_mp_min),
  credits_per_output integer not null check (credits_per_output > 0),
  estimated_usd_micros_per_output bigint check (estimated_usd_micros_per_output > 0),
  max_attempts smallint not null default 3 check (max_attempts between 1 and 3),
  active boolean not null default false,
  unique(model,resolution,reference_mp_min,reference_mp_max)
);

create table public.ai_product_credit_reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  idempotency_key uuid not null,
  price_rule_id uuid not null references public.ai_product_credit_price_rules(id),
  output_count smallint not null check (output_count between 2 and 5),
  credits_per_output integer not null check (credits_per_output > 0),
  entitlement_source text not null check (entitlement_source in ('paid_premium','premium_trial')),
  reserved_credits integer not null check ((entitlement_source='paid_premium' and reserved_credits = output_count * credits_per_output) or (entitlement_source='premium_trial' and reserved_credits=0)),
  reserved_allowance_credits integer not null check (reserved_allowance_credits >= 0),
  reserved_purchased_credits integer not null check (reserved_purchased_credits >= 0 and reserved_allowance_credits + reserved_purchased_credits = reserved_credits),
  reserved_usd_micros bigint not null check (reserved_usd_micros > 0),
  successful_outputs smallint check (successful_outputs between 0 and output_count),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 3),
  status text not null default 'reserved' check (status in ('reserved','processing','partially_settled','settled','failed','canceled','uncertain')),
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  unique(tenant_id,idempotency_key),
  unique(tenant_id,id)
);

create table public.ai_product_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reservation_id uuid references public.ai_product_credit_reservations(id),
  event_key text not null,
  event_type text not null check (event_type in ('grant','reserve','settle','refund','expire','manual_adjustment')),
  credit_delta integer not null,
  usd_micros_delta bigint not null default 0,
  actor_id uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  unique(event_key)
);

create table public.ai_product_credit_outputs (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reservation_id uuid not null,
  output_index smallint not null check (output_index between 1 and 5),
  provider_output_id text not null,
  storage_path text not null check (char_length(storage_path) > 0),
  saved_at timestamptz not null,
  accessible boolean not null default false,
  technical_valid boolean not null default false,
  primary key(tenant_id,reservation_id,output_index),
  unique(provider_output_id),
  foreign key(tenant_id,reservation_id) references public.ai_product_credit_reservations(tenant_id,id) on delete cascade
);

-- Provider API cost is tracked separately from product-credit accounting.
create table public.ai_product_credit_provider_costs (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reservation_id uuid not null,
  provider_request_id text not null,
  estimated_usd_micros bigint not null check (estimated_usd_micros >= 0),
  actual_usd_micros bigint check (actual_usd_micros >= 0),
  recorded_at timestamptz not null default now(),
  primary key(tenant_id,provider_request_id),
  foreign key(tenant_id,reservation_id) references public.ai_product_credit_reservations(tenant_id,id) on delete cascade
);

create table public.ai_product_credit_provider_events (
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  processed_at timestamptz not null default now(),
  primary key(provider,provider_event_id)
);

alter table public.ai_product_credit_accounts enable row level security;
alter table public.ai_product_credit_reservations enable row level security;
alter table public.ai_product_credit_ledger enable row level security;
alter table public.ai_product_credit_platform_control enable row level security;
alter table public.ai_product_credit_price_rules enable row level security;
alter table public.ai_product_credit_provider_events enable row level security;
alter table public.ai_product_credit_outputs enable row level security;
alter table public.ai_product_credit_provider_costs enable row level security;
revoke all on public.ai_product_credit_accounts,public.ai_product_credit_reservations,public.ai_product_credit_ledger,public.ai_product_credit_platform_control,public.ai_product_credit_price_rules,public.ai_product_credit_provider_events,public.ai_product_credit_outputs,public.ai_product_credit_provider_costs from public,anon,authenticated;
grant select on public.ai_product_credit_accounts,public.ai_product_credit_reservations,public.ai_product_credit_ledger,public.ai_product_credit_outputs,public.ai_product_credit_provider_costs to authenticated;
grant all on public.ai_product_credit_accounts,public.ai_product_credit_reservations,public.ai_product_credit_ledger,public.ai_product_credit_platform_control,public.ai_product_credit_price_rules,public.ai_product_credit_provider_events,public.ai_product_credit_outputs,public.ai_product_credit_provider_costs to service_role;

create policy ai_product_credit_account_owner_read on public.ai_product_credit_accounts for select to authenticated using (public.can_manage_tenant(tenant_id) or public.is_superadmin());
create policy ai_product_credit_reservation_owner_read on public.ai_product_credit_reservations for select to authenticated using (public.can_manage_tenant(tenant_id) or public.is_superadmin());
create policy ai_product_credit_ledger_owner_read on public.ai_product_credit_ledger for select to authenticated using (public.can_manage_tenant(tenant_id) or public.is_superadmin());
create policy ai_product_credit_outputs_owner_read on public.ai_product_credit_outputs for select to authenticated using (public.can_manage_tenant(tenant_id) or public.is_superadmin());
create policy ai_product_credit_costs_owner_read on public.ai_product_credit_provider_costs for select to authenticated using (public.can_manage_tenant(tenant_id) or public.is_superadmin());

create or replace function public.reserve_ai_product_credits(
  p_tenant_id uuid,p_requested_by uuid,p_idempotency_key uuid,p_output_count smallint,
  p_model text,p_resolution text,p_reference_mp numeric
) returns public.ai_product_credit_reservations
language plpgsql security definer set search_path='' as $$
declare v_account public.ai_product_credit_accounts; v_control public.ai_product_credit_platform_control; v_rule public.ai_product_credit_price_rules; v_existing public.ai_product_credit_reservations; v_tenant public.tenants; v_total integer; v_usd bigint; v_allowance integer; v_purchased integer; v_trial boolean:=false; v_row public.ai_product_credit_reservations;
begin
  if p_output_count not between 2 and 5 then raise exception 'Invalid output count'; end if;
  select * into v_existing from public.ai_product_credit_reservations where tenant_id=p_tenant_id and idempotency_key=p_idempotency_key;
  if found then return v_existing; end if;
  select * into v_control from public.ai_product_credit_platform_control where singleton=true for update;
  if not found or v_control.kill_switch then raise exception 'AI generation disabled'; end if;
  select * into v_rule from public.ai_product_credit_price_rules where active=true and model=p_model and resolution=p_resolution and p_reference_mp between reference_mp_min and reference_mp_max and estimated_usd_micros_per_output is not null order by reference_mp_max asc limit 1;
  if not found then raise exception 'AI pricing unconfirmed'; end if;
  select * into v_account from public.ai_product_credit_accounts where tenant_id=p_tenant_id for update;
  if not found or not v_account.generation_enabled then raise exception 'Tenant AI generation disabled'; end if;
  select * into v_tenant from public.tenants where id=p_tenant_id for update;
  if not found then raise exception 'Tenant not found'; end if;
  if v_tenant.status='active' and v_tenant.plan in ('standard','pro') then v_trial:=false;
  elsif v_tenant.status='trial' and v_tenant.trial_ends_at>now() and coalesce(v_tenant.next_plan,v_tenant.plan) in ('standard','pro') and v_account.premium_trial_job_started_at is null then v_trial:=true;
  else raise exception 'Paid Premium or unused Premium trial job required'; end if;
  v_total:=case when v_trial then 0 else p_output_count*v_rule.credits_per_output end; v_usd:=p_output_count*v_rule.estimated_usd_micros_per_output;
  if (v_account.allowance_balance-v_account.reserved_allowance)+(v_account.purchased_balance-v_account.reserved_purchased) < v_total then raise exception 'Insufficient AI product credits'; end if;
  v_allowance:=least(v_total,v_account.allowance_balance-v_account.reserved_allowance); v_purchased:=v_total-v_allowance;
  if v_account.spent_usd_micros+v_account.reserved_usd_micros+v_usd > v_account.tenant_usd_micros_cap then raise exception 'Tenant AI monetary cap reached'; end if;
  if v_control.spent_usd_micros+v_control.reserved_usd_micros+v_usd > v_control.owner_usd_micros_cap then raise exception 'Owner AI monetary cap reached'; end if;
  update public.ai_product_credit_accounts set reserved_allowance=reserved_allowance+v_allowance,reserved_purchased=reserved_purchased+v_purchased,reserved_usd_micros=reserved_usd_micros+v_usd,updated_at=now() where tenant_id=p_tenant_id;
  update public.ai_product_credit_platform_control set reserved_usd_micros=reserved_usd_micros+v_usd,updated_at=now() where singleton=true;
  insert into public.ai_product_credit_reservations(tenant_id,requested_by,idempotency_key,price_rule_id,output_count,credits_per_output,entitlement_source,reserved_credits,reserved_allowance_credits,reserved_purchased_credits,reserved_usd_micros)
  values(p_tenant_id,p_requested_by,p_idempotency_key,v_rule.id,p_output_count,v_rule.credits_per_output,case when v_trial then 'premium_trial' else 'paid_premium' end,v_total,v_allowance,v_purchased,v_usd) returning * into v_row;
  if v_trial then update public.ai_product_credit_accounts set premium_trial_job_started_at=now(),premium_trial_reservation_id=v_row.id where tenant_id=p_tenant_id and premium_trial_job_started_at is null; if not found then raise exception 'Premium trial job already used'; end if; end if;
  insert into public.ai_product_credit_ledger(tenant_id,reservation_id,event_key,event_type,credit_delta,actor_id,metadata) values(p_tenant_id,v_row.id,'reserve:'||v_row.id,'reserve',-v_total,p_requested_by,jsonb_build_object('outputs',p_output_count,'model',p_model,'resolution',p_resolution));
  return v_row;
end $$;

create or replace function public.settle_ai_product_credits(p_tenant_id uuid,p_reservation_id uuid,p_successful_outputs smallint,p_provider_request_id text)
returns public.ai_product_credit_reservations language plpgsql security definer set search_path='' as $$
declare v_row public.ai_product_credit_reservations; v_charge integer; v_refund integer; v_allowance_charge integer; v_purchased_charge integer; v_usd_charge bigint; v_usd_refund bigint; v_valid_outputs smallint;
begin
  select * into v_row from public.ai_product_credit_reservations where tenant_id=p_tenant_id and id=p_reservation_id for update;
  if not found then raise exception 'Reservation not found'; end if;
  if v_row.status in ('settled','partially_settled','failed','canceled') then return v_row; end if;
  if p_successful_outputs not between 0 and v_row.output_count then raise exception 'Invalid successful output count'; end if;
  select count(*)::smallint into v_valid_outputs from public.ai_product_credit_outputs where tenant_id=p_tenant_id and reservation_id=p_reservation_id and saved_at is not null and accessible and technical_valid;
  if p_successful_outputs<>v_valid_outputs then raise exception 'Successful output count does not match saved accessible technical-valid outputs'; end if;
  v_charge:=p_successful_outputs*v_row.credits_per_output; v_refund:=v_row.reserved_credits-v_charge;
  v_allowance_charge:=least(v_charge,v_row.reserved_allowance_credits); v_purchased_charge:=v_charge-v_allowance_charge;
  v_usd_charge:=(v_row.reserved_usd_micros*p_successful_outputs)/v_row.output_count; v_usd_refund:=v_row.reserved_usd_micros-v_usd_charge;
  update public.ai_product_credit_accounts set allowance_balance=allowance_balance-v_allowance_charge,purchased_balance=purchased_balance-v_purchased_charge,reserved_allowance=reserved_allowance-v_row.reserved_allowance_credits,reserved_purchased=reserved_purchased-v_row.reserved_purchased_credits,reserved_usd_micros=reserved_usd_micros-v_row.reserved_usd_micros,spent_usd_micros=spent_usd_micros+v_usd_charge,updated_at=now() where tenant_id=p_tenant_id and allowance_balance>=v_allowance_charge and purchased_balance>=v_purchased_charge and reserved_allowance>=v_row.reserved_allowance_credits and reserved_purchased>=v_row.reserved_purchased_credits and reserved_usd_micros>=v_row.reserved_usd_micros;
  if not found then raise exception 'Credit invariant failed'; end if;
  update public.ai_product_credit_platform_control set reserved_usd_micros=reserved_usd_micros-v_row.reserved_usd_micros,spent_usd_micros=spent_usd_micros+v_usd_charge,updated_at=now() where singleton=true and reserved_usd_micros>=v_row.reserved_usd_micros;
  update public.ai_product_credit_reservations set successful_outputs=p_successful_outputs,status=case when p_successful_outputs=0 then 'failed' when p_successful_outputs=output_count then 'settled' else 'partially_settled' end,settled_at=now() where id=v_row.id returning * into v_row;
  if v_row.entitlement_source='premium_trial' and p_successful_outputs>0 then update public.ai_product_credit_accounts set premium_trial_job_consumed_at=coalesce(premium_trial_job_consumed_at,now()) where tenant_id=p_tenant_id and premium_trial_reservation_id=v_row.id; end if;
  insert into public.ai_product_credit_ledger(tenant_id,reservation_id,event_key,event_type,credit_delta,usd_micros_delta,metadata) values(p_tenant_id,v_row.id,'settle:'||v_row.id,'settle',0,v_usd_charge,jsonb_build_object('successful_outputs',p_successful_outputs,'provider_request_id',p_provider_request_id));
  if v_refund>0 then insert into public.ai_product_credit_ledger(tenant_id,reservation_id,event_key,event_type,credit_delta,usd_micros_delta,metadata) values(p_tenant_id,v_row.id,'refund:'||v_row.id,'refund',v_refund,-v_usd_refund,jsonb_build_object('failed_outputs',v_row.output_count-p_successful_outputs)); end if;
  return v_row;
end $$;

create or replace function public.admin_grant_ai_product_credits(p_tenant_id uuid,p_credits integer,p_reason text,p_event_key text)
returns integer language plpgsql security definer set search_path='' as $$
declare v_balance integer;
begin
  if not public.is_superadmin() then raise exception 'Forbidden'; end if;
  if p_credits<1 or p_credits>100000 or char_length(btrim(p_reason))<8 then raise exception 'Invalid grant'; end if;
  insert into public.ai_product_credit_ledger(tenant_id,event_key,event_type,credit_delta,actor_id,metadata) values(p_tenant_id,p_event_key,'grant',p_credits,(select auth.uid()),jsonb_build_object('reason',p_reason)) on conflict(event_key) do nothing;
  if not found then select allowance_balance+purchased_balance into v_balance from public.ai_product_credit_accounts where tenant_id=p_tenant_id; return v_balance; end if;
  insert into public.ai_product_credit_accounts(tenant_id,purchased_balance,tenant_credit_cap) values(p_tenant_id,p_credits,p_credits) on conflict(tenant_id) do update set purchased_balance=ai_product_credit_accounts.purchased_balance+p_credits,tenant_credit_cap=greatest(ai_product_credit_accounts.tenant_credit_cap,ai_product_credit_accounts.allowance_balance+ai_product_credit_accounts.purchased_balance+p_credits),updated_at=now() returning allowance_balance+purchased_balance into v_balance;
  return v_balance;
end $$;

create or replace function public.admin_configure_ai_credit_controls(
  p_tenant_id uuid,p_generation_enabled boolean,p_tenant_credit_cap integer,
  p_tenant_usd_micros_cap bigint,p_kill_switch boolean,p_owner_usd_micros_cap bigint
) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_superadmin() then raise exception 'Forbidden'; end if;
  if p_tenant_credit_cap<0 or p_tenant_usd_micros_cap<0 or p_owner_usd_micros_cap<0 then raise exception 'Invalid cap'; end if;
  update public.ai_product_credit_platform_control set kill_switch=p_kill_switch,owner_usd_micros_cap=p_owner_usd_micros_cap,updated_at=now()
    where singleton=true and spent_usd_micros+reserved_usd_micros<=p_owner_usd_micros_cap;
  if not found then raise exception 'Owner cap is below current spend and reservations'; end if;
  update public.ai_product_credit_accounts set generation_enabled=p_generation_enabled,tenant_credit_cap=p_tenant_credit_cap,tenant_usd_micros_cap=p_tenant_usd_micros_cap,updated_at=now()
    where tenant_id=p_tenant_id and spent_usd_micros+reserved_usd_micros<=p_tenant_usd_micros_cap;
  if not found then raise exception 'Tenant missing or cap is below current spend and reservations'; end if;
end $$;

revoke all on function public.reserve_ai_product_credits(uuid,uuid,uuid,smallint,text,text,numeric) from public,anon,authenticated;
revoke all on function public.settle_ai_product_credits(uuid,uuid,smallint,text) from public,anon,authenticated;
grant execute on function public.reserve_ai_product_credits(uuid,uuid,uuid,smallint,text,text,numeric) to service_role;
grant execute on function public.settle_ai_product_credits(uuid,uuid,smallint,text) to service_role;
revoke all on function public.admin_grant_ai_product_credits(uuid,integer,text,text) from public,anon;
grant execute on function public.admin_grant_ai_product_credits(uuid,integer,text,text) to authenticated;
revoke all on function public.admin_configure_ai_credit_controls(uuid,boolean,integer,bigint,boolean,bigint) from public,anon;
grant execute on function public.admin_configure_ai_credit_controls(uuid,boolean,integer,bigint,boolean,bigint) to authenticated;
