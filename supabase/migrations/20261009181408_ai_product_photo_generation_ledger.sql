-- Prepared locally only. Applying this migration requires a separate production approval.
-- No allowance, price, provider deployment or spend cap is seeded by this migration.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ai-product-photos','ai-product-photos',false,10000000,array['image/jpeg'])
on conflict(id) do nothing;

do $$
begin
  if exists (
    select 1
    from storage.buckets
    where id='ai-product-photos'
      and (
        public
        or file_size_limit is distinct from 10000000
        or allowed_mime_types is distinct from array['image/jpeg']::text[]
      )
  ) then
    raise exception 'ai-product-photos bucket exists with unsafe settings';
  end if;
end
$$;

create table public.ai_product_credit_accounts (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  allowance_balance integer not null default 0 check (allowance_balance >= 0),
  allowance_period_ends_at timestamptz,
  purchased_balance integer not null default 0 check (purchased_balance >= 0),
  reserved_allowance integer not null default 0 check (reserved_allowance between 0 and allowance_balance),
  reserved_purchased integer not null default 0 check (reserved_purchased between 0 and purchased_balance),
  generation_enabled boolean not null default false,
  tenant_usd_micros_cap bigint not null default 0 check (tenant_usd_micros_cap >= 0),
  spent_usd_micros bigint not null default 0 check (spent_usd_micros >= 0),
  reserved_usd_micros bigint not null default 0 check (reserved_usd_micros >= 0),
  premium_trial_job_started_at timestamptz,
  premium_trial_job_consumed_at timestamptz,
  premium_trial_reservation_id uuid,
  updated_at timestamptz not null default now(),
  check (spent_usd_micros + reserved_usd_micros <= tenant_usd_micros_cap)
);

create table public.ai_product_credit_platform_control (
  singleton boolean primary key default true check (singleton),
  kill_switch boolean not null default true,
  owner_usd_micros_cap bigint not null default 0 check (owner_usd_micros_cap >= 0),
  spent_usd_micros bigint not null default 0 check (spent_usd_micros >= 0),
  reserved_usd_micros bigint not null default 0 check (reserved_usd_micros >= 0),
  updated_at timestamptz not null default now(),
  check (spent_usd_micros + reserved_usd_micros <= owner_usd_micros_cap)
);
insert into public.ai_product_credit_platform_control(singleton) values(true);

create table public.ai_product_credit_price_rules (
  id uuid primary key default gen_random_uuid(),
  model text not null,
  resolution text not null,
  reference_mp_min numeric(8,2) not null check (reference_mp_min >= 0),
  reference_mp_max numeric(8,2) not null check (reference_mp_max >= reference_mp_min),
  credits_per_output integer not null check (credits_per_output > 0),
  estimated_usd_micros_per_output bigint not null check (estimated_usd_micros_per_output > 0),
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
  estimated_usd_micros_per_output bigint not null check (estimated_usd_micros_per_output > 0),
  entitlement_source text not null check (entitlement_source in ('paid_premium','premium_trial')),
  reserved_credits integer not null check (reserved_credits >= 0),
  reserved_allowance_credits integer not null check (reserved_allowance_credits >= 0),
  reserved_purchased_credits integer not null check (reserved_purchased_credits >= 0),
  reserved_usd_micros bigint not null check (reserved_usd_micros > 0),
  successful_outputs smallint check (successful_outputs between 0 and output_count),
  status text not null default 'reserved' check (status in ('reserved','processing','partially_settled','settled','failed','canceled','uncertain')),
  failure_reason text,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  unique(tenant_id,idempotency_key),
  unique(tenant_id,id),
  check (reserved_allowance_credits + reserved_purchased_credits = reserved_credits),
  check ((entitlement_source='premium_trial' and reserved_credits=0) or (entitlement_source='paid_premium' and reserved_credits=output_count*credits_per_output))
);

create table public.ai_product_credit_outputs (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reservation_id uuid not null,
  output_index smallint not null check (output_index between 1 and 5),
  provider_output_id text not null,
  storage_path text not null check (storage_path like tenant_id::text || '/%' and storage_path not like '%..%'),
  model text not null,
  model_version text,
  estimated_usd_micros bigint not null check (estimated_usd_micros >= 0),
  billing_basis text not null check (billing_basis in ('provider-reported','configured-ceiling')),
  saved_at timestamptz not null default now(),
  primary key(tenant_id,reservation_id,output_index),
  unique(provider_output_id),
  foreign key(tenant_id,reservation_id) references public.ai_product_credit_reservations(tenant_id,id) on delete cascade
);

-- Provider spend is independent from customer credits. Failed-but-billed attempts can
-- be journaled here during reconciliation without charging a customer for no image.
create table public.ai_product_credit_provider_costs (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reservation_id uuid not null,
  provider_request_id text not null,
  outcome text not null check (outcome in ('succeeded','failed_billed')),
  estimated_usd_micros bigint not null check (estimated_usd_micros >= 0),
  actual_usd_micros bigint check (actual_usd_micros >= 0),
  recorded_at timestamptz not null default now(),
  primary key(tenant_id,provider_request_id),
  foreign key(tenant_id,reservation_id) references public.ai_product_credit_reservations(tenant_id,id) on delete cascade
);

create table public.ai_product_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reservation_id uuid references public.ai_product_credit_reservations(id) on delete cascade,
  event_key text not null unique,
  event_type text not null check (event_type in ('grant','reserve','settle','refund','uncertain','manual_adjustment')),
  credit_delta integer not null,
  usd_micros_delta bigint not null default 0,
  actor_id uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now()
);

create index ai_product_credit_reservations_tenant_created_idx on public.ai_product_credit_reservations(tenant_id,created_at desc);
create index ai_product_credit_outputs_tenant_reservation_idx on public.ai_product_credit_outputs(tenant_id,reservation_id);
create index ai_product_credit_provider_costs_tenant_reservation_idx on public.ai_product_credit_provider_costs(tenant_id,reservation_id);
create index ai_product_credit_ledger_tenant_created_idx on public.ai_product_credit_ledger(tenant_id,created_at desc);

alter table public.ai_product_credit_accounts enable row level security;
alter table public.ai_product_credit_platform_control enable row level security;
alter table public.ai_product_credit_price_rules enable row level security;
alter table public.ai_product_credit_reservations enable row level security;
alter table public.ai_product_credit_outputs enable row level security;
alter table public.ai_product_credit_provider_costs enable row level security;
alter table public.ai_product_credit_ledger enable row level security;
revoke all on public.ai_product_credit_accounts,public.ai_product_credit_platform_control,public.ai_product_credit_price_rules,public.ai_product_credit_reservations,public.ai_product_credit_outputs,public.ai_product_credit_provider_costs,public.ai_product_credit_ledger from public,anon,authenticated;
grant select on public.ai_product_credit_accounts,public.ai_product_credit_reservations,public.ai_product_credit_outputs,public.ai_product_credit_provider_costs,public.ai_product_credit_ledger to authenticated;
grant all on public.ai_product_credit_accounts,public.ai_product_credit_platform_control,public.ai_product_credit_price_rules,public.ai_product_credit_reservations,public.ai_product_credit_outputs,public.ai_product_credit_provider_costs,public.ai_product_credit_ledger to service_role;

create policy ai_product_credit_accounts_owner_read on public.ai_product_credit_accounts for select to authenticated using (public.can_manage_tenant(tenant_id));
create policy ai_product_credit_reservations_owner_read on public.ai_product_credit_reservations for select to authenticated using (public.can_manage_tenant(tenant_id));
create policy ai_product_credit_outputs_owner_read on public.ai_product_credit_outputs for select to authenticated using (public.can_manage_tenant(tenant_id));
create policy ai_product_credit_provider_costs_owner_read on public.ai_product_credit_provider_costs for select to authenticated using (public.can_manage_tenant(tenant_id));
create policy ai_product_credit_ledger_owner_read on public.ai_product_credit_ledger for select to authenticated using (public.can_manage_tenant(tenant_id));

create or replace function public.reserve_ai_product_credits(
  p_tenant_id uuid,p_requested_by uuid,p_idempotency_key uuid,p_output_count smallint,
  p_model text,p_resolution text,p_reference_mp numeric,p_expected_usd_micros_per_output bigint
) returns table(reservation_id uuid,acquired boolean)
language plpgsql security definer set search_path='' as $$
declare v_account public.ai_product_credit_accounts; v_control public.ai_product_credit_platform_control; v_rule public.ai_product_credit_price_rules;
  v_existing public.ai_product_credit_reservations; v_tenant public.tenants; v_total integer; v_usd bigint; v_allowance integer; v_purchased integer; v_trial boolean:=false; v_id uuid;
begin
  if p_output_count not between 2 and 5 or p_expected_usd_micros_per_output<=0 then raise exception 'Invalid reservation'; end if;
  select * into v_control from public.ai_product_credit_platform_control where singleton=true for update;
  if not found or v_control.kill_switch then raise exception 'AI generation disabled'; end if;
  select * into v_existing from public.ai_product_credit_reservations where tenant_id=p_tenant_id and idempotency_key=p_idempotency_key;
  if found then return query select v_existing.id,false; return; end if;
  select * into v_rule from public.ai_product_credit_price_rules where active and model=p_model and resolution=p_resolution
    and p_reference_mp between reference_mp_min and reference_mp_max and estimated_usd_micros_per_output=p_expected_usd_micros_per_output
    order by reference_mp_max asc limit 1;
  if not found then raise exception 'AI pricing unconfirmed'; end if;
  select * into v_account from public.ai_product_credit_accounts where tenant_id=p_tenant_id for update;
  if not found or not v_account.generation_enabled then raise exception 'Tenant AI generation disabled'; end if;
  select * into v_tenant from public.tenants where id=p_tenant_id for update;
  if not found then raise exception 'Tenant not found'; end if;
  if v_tenant.status='active' and v_tenant.plan in ('standard','pro') then v_trial:=false;
  elsif v_tenant.status='trial' and v_tenant.trial_ends_at>now() and coalesce(v_tenant.next_plan,v_tenant.plan) in ('standard','pro') and v_account.premium_trial_job_started_at is null then v_trial:=true;
  else raise exception 'Paid Premium or unused Premium trial job required'; end if;
  v_total:=case when v_trial then 0 else p_output_count*v_rule.credits_per_output end;
  v_usd:=p_output_count*v_rule.estimated_usd_micros_per_output;
  if (v_account.allowance_balance-v_account.reserved_allowance)+(v_account.purchased_balance-v_account.reserved_purchased)<v_total then raise exception 'Insufficient AI product credits'; end if;
  if v_account.spent_usd_micros+v_account.reserved_usd_micros+v_usd>v_account.tenant_usd_micros_cap then raise exception 'Tenant AI monetary cap reached'; end if;
  if v_control.spent_usd_micros+v_control.reserved_usd_micros+v_usd>v_control.owner_usd_micros_cap then raise exception 'Owner AI monetary cap reached'; end if;
  v_allowance:=least(v_total,v_account.allowance_balance-v_account.reserved_allowance); v_purchased:=v_total-v_allowance;
  update public.ai_product_credit_accounts set reserved_allowance=reserved_allowance+v_allowance,reserved_purchased=reserved_purchased+v_purchased,reserved_usd_micros=reserved_usd_micros+v_usd,updated_at=now() where tenant_id=p_tenant_id;
  update public.ai_product_credit_platform_control set reserved_usd_micros=reserved_usd_micros+v_usd,updated_at=now() where singleton=true;
  insert into public.ai_product_credit_reservations(tenant_id,requested_by,idempotency_key,price_rule_id,output_count,credits_per_output,estimated_usd_micros_per_output,entitlement_source,reserved_credits,reserved_allowance_credits,reserved_purchased_credits,reserved_usd_micros,status)
    values(p_tenant_id,p_requested_by,p_idempotency_key,v_rule.id,p_output_count,v_rule.credits_per_output,v_rule.estimated_usd_micros_per_output,case when v_trial then 'premium_trial' else 'paid_premium' end,v_total,v_allowance,v_purchased,v_usd,'processing') returning id into v_id;
  if v_trial then update public.ai_product_credit_accounts set premium_trial_job_started_at=now(),premium_trial_reservation_id=v_id where tenant_id=p_tenant_id and premium_trial_job_started_at is null; if not found then raise exception 'Premium trial job already used'; end if; end if;
  insert into public.ai_product_credit_ledger(tenant_id,reservation_id,event_key,event_type,credit_delta,actor_id,metadata) values(p_tenant_id,v_id,'reserve:'||v_id,'reserve',-v_total,p_requested_by,jsonb_build_object('outputs',p_output_count,'model',p_model,'resolution',p_resolution));
  return query select v_id,true;
end $$;

create or replace function public.record_ai_product_output(
  p_tenant_id uuid,p_reservation_id uuid,p_output_index smallint,p_provider_output_id text,p_storage_path text,p_model text,p_model_version text,p_estimated_usd_micros bigint,p_billing_basis text
) returns public.ai_product_credit_outputs language plpgsql security definer set search_path='' as $$
declare v_reservation public.ai_product_credit_reservations; v_output public.ai_product_credit_outputs;
begin
  select * into v_reservation from public.ai_product_credit_reservations where tenant_id=p_tenant_id and id=p_reservation_id for update;
  if not found or v_reservation.status not in ('reserved','processing','uncertain') then raise exception 'Reservation is not writable'; end if;
  if p_output_index not between 1 and v_reservation.output_count or p_estimated_usd_micros<0 or p_estimated_usd_micros>v_reservation.estimated_usd_micros_per_output or p_billing_basis not in ('provider-reported','configured-ceiling') then raise exception 'Invalid output accounting'; end if;
  if p_storage_path not like p_tenant_id::text||'/%' or p_storage_path like '%..%' then raise exception 'Invalid durable output'; end if;
  insert into public.ai_product_credit_provider_costs(tenant_id,reservation_id,provider_request_id,outcome,estimated_usd_micros,actual_usd_micros)
    values(p_tenant_id,p_reservation_id,p_provider_output_id,'succeeded',p_estimated_usd_micros,case when p_billing_basis='provider-reported' then p_estimated_usd_micros else null end)
    on conflict(tenant_id,provider_request_id) do nothing;
  insert into public.ai_product_credit_outputs(tenant_id,reservation_id,output_index,provider_output_id,storage_path,model,model_version,estimated_usd_micros,billing_basis)
    values(p_tenant_id,p_reservation_id,p_output_index,p_provider_output_id,p_storage_path,p_model,p_model_version,p_estimated_usd_micros,p_billing_basis)
    on conflict(tenant_id,reservation_id,output_index) do nothing returning * into v_output;
  if not found then select * into v_output from public.ai_product_credit_outputs where tenant_id=p_tenant_id and reservation_id=p_reservation_id and output_index=p_output_index;
    if v_output.provider_output_id<>p_provider_output_id or v_output.storage_path<>p_storage_path then raise exception 'Output idempotency conflict'; end if;
  end if;
  return v_output;
end $$;

create or replace function public.reconcile_ai_product_provider_cost(
  p_tenant_id uuid,p_reservation_id uuid,p_provider_request_id text,p_outcome text,p_actual_usd_micros bigint
) returns void language plpgsql security definer set search_path='' as $$
declare v_reservation public.ai_product_credit_reservations; v_cost public.ai_product_credit_provider_costs; v_cost_count smallint;
begin
  select * into v_reservation from public.ai_product_credit_reservations where tenant_id=p_tenant_id and id=p_reservation_id for update;
  if not found or v_reservation.status not in ('processing','uncertain') then raise exception 'Open reservation not found'; end if;
  if p_outcome not in ('succeeded','failed_billed') then raise exception 'Invalid provider outcome'; end if;
  if p_actual_usd_micros<0 or p_actual_usd_micros>v_reservation.estimated_usd_micros_per_output then raise exception 'Provider cost exceeds reserved per-output ceiling'; end if;
  select * into v_cost from public.ai_product_credit_provider_costs where tenant_id=p_tenant_id and provider_request_id=p_provider_request_id for update;
  if found then
    if v_cost.reservation_id<>p_reservation_id or v_cost.outcome<>p_outcome then raise exception 'Provider cost idempotency conflict'; end if;
    update public.ai_product_credit_provider_costs set actual_usd_micros=p_actual_usd_micros where tenant_id=p_tenant_id and provider_request_id=p_provider_request_id;
  else
    if p_outcome<>'failed_billed' or v_reservation.status<>'uncertain' then raise exception 'Missing successful provider cost'; end if;
    select count(*)::smallint into v_cost_count from public.ai_product_credit_provider_costs where tenant_id=p_tenant_id and reservation_id=p_reservation_id;
    if v_cost_count>=v_reservation.output_count then raise exception 'Provider attempt count exceeds reservation'; end if;
    insert into public.ai_product_credit_provider_costs(tenant_id,reservation_id,provider_request_id,outcome,estimated_usd_micros,actual_usd_micros)
      values(p_tenant_id,p_reservation_id,p_provider_request_id,'failed_billed',v_reservation.estimated_usd_micros_per_output,p_actual_usd_micros);
  end if;
end $$;

create or replace function public.settle_ai_product_credits(p_tenant_id uuid,p_reservation_id uuid,p_successful_outputs smallint,p_provider_request_ids text[])
returns public.ai_product_credit_reservations language plpgsql security definer set search_path='' as $$
declare v_row public.ai_product_credit_reservations; v_count smallint; v_all_count smallint; v_charge integer; v_allowance_charge integer; v_purchased_charge integer; v_actual_usd bigint; v_refund integer;
begin
  select * into v_row from public.ai_product_credit_reservations where tenant_id=p_tenant_id and id=p_reservation_id for update;
  if not found then raise exception 'Reservation not found'; end if;
  if v_row.status in ('settled','partially_settled','failed','canceled') then return v_row; end if;
  select count(*)::smallint into v_count from public.ai_product_credit_outputs where tenant_id=p_tenant_id and reservation_id=p_reservation_id and provider_output_id=any(p_provider_request_ids);
  select count(*)::smallint into v_all_count from public.ai_product_credit_outputs where tenant_id=p_tenant_id and reservation_id=p_reservation_id;
  select coalesce(sum(coalesce(actual_usd_micros,estimated_usd_micros)),0)::bigint into v_actual_usd from public.ai_product_credit_provider_costs where tenant_id=p_tenant_id and reservation_id=p_reservation_id;
  if p_successful_outputs<>v_count or v_count<>v_all_count or cardinality(p_provider_request_ids)<>v_count then raise exception 'Successful outputs do not match all durable provider outputs'; end if;
  if v_actual_usd>v_row.reserved_usd_micros then raise exception 'Provider spend exceeds reservation'; end if;
  v_charge:=case when v_row.entitlement_source='premium_trial' then 0 else v_count*v_row.credits_per_output end; v_refund:=v_row.reserved_credits-v_charge;
  v_allowance_charge:=least(v_charge,v_row.reserved_allowance_credits); v_purchased_charge:=v_charge-v_allowance_charge;
  update public.ai_product_credit_accounts set allowance_balance=allowance_balance-v_allowance_charge,purchased_balance=purchased_balance-v_purchased_charge,reserved_allowance=reserved_allowance-v_row.reserved_allowance_credits,reserved_purchased=reserved_purchased-v_row.reserved_purchased_credits,reserved_usd_micros=reserved_usd_micros-v_row.reserved_usd_micros,spent_usd_micros=spent_usd_micros+v_actual_usd,updated_at=now() where tenant_id=p_tenant_id and reserved_allowance>=v_row.reserved_allowance_credits and reserved_purchased>=v_row.reserved_purchased_credits and reserved_usd_micros>=v_row.reserved_usd_micros;
  if not found then raise exception 'Tenant accounting invariant failed'; end if;
  update public.ai_product_credit_platform_control set reserved_usd_micros=reserved_usd_micros-v_row.reserved_usd_micros,spent_usd_micros=spent_usd_micros+v_actual_usd,updated_at=now() where singleton=true and reserved_usd_micros>=v_row.reserved_usd_micros;
  if not found then raise exception 'Platform accounting invariant failed'; end if;
  update public.ai_product_credit_reservations set successful_outputs=v_count,status=case when v_count=0 then 'failed' when v_count=output_count then 'settled' else 'partially_settled' end,settled_at=now() where id=v_row.id returning * into v_row;
  if v_row.entitlement_source='premium_trial' and v_count>0 then update public.ai_product_credit_accounts set premium_trial_job_consumed_at=coalesce(premium_trial_job_consumed_at,now()) where tenant_id=p_tenant_id and premium_trial_reservation_id=v_row.id;
  elsif v_row.entitlement_source='premium_trial' then update public.ai_product_credit_accounts set premium_trial_job_started_at=null,premium_trial_reservation_id=null where tenant_id=p_tenant_id and premium_trial_reservation_id=v_row.id and premium_trial_job_consumed_at is null; end if;
  insert into public.ai_product_credit_ledger(tenant_id,reservation_id,event_key,event_type,credit_delta,usd_micros_delta,metadata) values(p_tenant_id,v_row.id,'settle:'||v_row.id,'settle',0,v_actual_usd,jsonb_build_object('successful_outputs',v_count));
  if v_refund>0 then insert into public.ai_product_credit_ledger(tenant_id,reservation_id,event_key,event_type,credit_delta,metadata) values(p_tenant_id,v_row.id,'refund:'||v_row.id,'refund',v_refund,jsonb_build_object('failed_outputs',v_row.output_count-v_count)); end if;
  return v_row;
end $$;

create or replace function public.release_ai_product_credit_reservation(p_tenant_id uuid,p_reservation_id uuid,p_reason text)
returns public.ai_product_credit_reservations language plpgsql security definer set search_path='' as $$
declare v_row public.ai_product_credit_reservations;
begin
  select * into v_row from public.ai_product_credit_reservations where tenant_id=p_tenant_id and id=p_reservation_id for update;
  if not found then raise exception 'Reservation not found'; end if;
  if v_row.status in ('failed','canceled') then return v_row; end if;
  -- `uncertain` may be released only by this service-only RPC after an operator/provider
  -- has confirmed that no charge occurred. Durable outputs still prevent a release.
  if v_row.status not in ('reserved','processing','uncertain')
    or exists(select 1 from public.ai_product_credit_outputs where tenant_id=p_tenant_id and reservation_id=p_reservation_id)
    or exists(select 1 from public.ai_product_credit_provider_costs where tenant_id=p_tenant_id and reservation_id=p_reservation_id)
    then raise exception 'Reservation requires reconciliation'; end if;
  update public.ai_product_credit_accounts set reserved_allowance=reserved_allowance-v_row.reserved_allowance_credits,reserved_purchased=reserved_purchased-v_row.reserved_purchased_credits,reserved_usd_micros=reserved_usd_micros-v_row.reserved_usd_micros,premium_trial_job_started_at=case when premium_trial_reservation_id=v_row.id and premium_trial_job_consumed_at is null then null else premium_trial_job_started_at end,premium_trial_reservation_id=case when premium_trial_reservation_id=v_row.id and premium_trial_job_consumed_at is null then null else premium_trial_reservation_id end,updated_at=now() where tenant_id=p_tenant_id;
  update public.ai_product_credit_platform_control set reserved_usd_micros=reserved_usd_micros-v_row.reserved_usd_micros,updated_at=now() where singleton=true;
  update public.ai_product_credit_reservations set status='failed',failure_reason=left(p_reason,500),successful_outputs=0,settled_at=now() where id=v_row.id returning * into v_row;
  insert into public.ai_product_credit_ledger(tenant_id,reservation_id,event_key,event_type,credit_delta,metadata) values(p_tenant_id,v_row.id,'refund:'||v_row.id,'refund',v_row.reserved_credits,jsonb_build_object('reason',left(p_reason,500)));
  return v_row;
end $$;

create or replace function public.mark_ai_product_credit_reservation_uncertain(p_tenant_id uuid,p_reservation_id uuid,p_reason text,p_recovery_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
  if jsonb_typeof(p_recovery_metadata) is distinct from 'object' then raise exception 'Invalid recovery metadata'; end if;
  update public.ai_product_credit_reservations set status='uncertain',failure_reason=left(p_reason,500) where tenant_id=p_tenant_id and id=p_reservation_id and status in ('reserved','processing');
  if found then insert into public.ai_product_credit_ledger(tenant_id,reservation_id,event_key,event_type,credit_delta,metadata) values(p_tenant_id,p_reservation_id,'uncertain:'||p_reservation_id,'uncertain',0,jsonb_build_object('reason',left(p_reason,500),'recovery',p_recovery_metadata)) on conflict(event_key) do update set metadata=excluded.metadata; end if;
end $$;

revoke all on function public.reserve_ai_product_credits(uuid,uuid,uuid,smallint,text,text,numeric,bigint) from public,anon,authenticated;
revoke all on function public.record_ai_product_output(uuid,uuid,smallint,text,text,text,text,bigint,text) from public,anon,authenticated;
revoke all on function public.reconcile_ai_product_provider_cost(uuid,uuid,text,text,bigint) from public,anon,authenticated;
revoke all on function public.settle_ai_product_credits(uuid,uuid,smallint,text[]) from public,anon,authenticated;
revoke all on function public.release_ai_product_credit_reservation(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.mark_ai_product_credit_reservation_uncertain(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_ai_product_credits(uuid,uuid,uuid,smallint,text,text,numeric,bigint) to service_role;
grant execute on function public.record_ai_product_output(uuid,uuid,smallint,text,text,text,text,bigint,text) to service_role;
grant execute on function public.reconcile_ai_product_provider_cost(uuid,uuid,text,text,bigint) to service_role;
grant execute on function public.settle_ai_product_credits(uuid,uuid,smallint,text[]) to service_role;
grant execute on function public.release_ai_product_credit_reservation(uuid,uuid,text) to service_role;
grant execute on function public.mark_ai_product_credit_reservation_uncertain(uuid,uuid,text,jsonb) to service_role;
