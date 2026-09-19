create table public.crm_setup_charges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  integration_request_id uuid not null unique references public.crm_integration_requests(id) on delete cascade,
  amount_kzt integer not null default 70000 check (amount_kzt = 70000),
  status text not null check (status in ('awaiting_payment','paid','included')),
  polar_order_id text unique,
  connected_at timestamptz not null default now(),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crm_setup_charges enable row level security;
create policy crm_setup_charges_read on public.crm_setup_charges for select to authenticated
using (public.can_manage_tenant(tenant_id));

create or replace function public.create_crm_setup_charge()
returns trigger language plpgsql security definer set search_path='' as $$
declare tenant_plan public.tenant_plan;
begin
  if new.status='connected' and (tg_op='INSERT' or old.status is distinct from 'connected') then
    select plan into tenant_plan from public.tenants where id=new.tenant_id;
    insert into public.crm_setup_charges(tenant_id,integration_request_id,status)
    values(new.tenant_id,new.id,case when tenant_plan='basic' then 'awaiting_payment' else 'included' end)
    on conflict(integration_request_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.create_crm_setup_charge() from public,anon,authenticated;
create trigger crm_setup_charge_after_connection after insert or update of status on public.crm_integration_requests
for each row execute function public.create_crm_setup_charge();

insert into public.crm_setup_charges(tenant_id,integration_request_id,status,connected_at)
select r.tenant_id,r.id,case when t.plan='basic' then 'awaiting_payment' else 'included' end,r.last_status_at
from public.crm_integration_requests r join public.tenants t on t.id=r.tenant_id
where r.status='connected'
on conflict(integration_request_id) do nothing;

create or replace function public.confirm_crm_setup_payment(
  p_event_id text,p_event_type text,p_payload jsonb,p_tenant_id uuid,p_charge_id uuid,p_order_id text,p_amount_kzt integer
)
returns boolean language plpgsql security definer set search_path='' as $$
declare changed uuid;
begin
  if p_amount_kzt<>70000 then raise exception 'Invalid CRM setup amount';end if;
  insert into public.polar_webhook_events(event_id,event_type,payload)
  values(p_event_id,p_event_type,p_payload) on conflict(event_id) do nothing;
  if not found then return false;end if;
  update public.crm_setup_charges set status='paid',polar_order_id=p_order_id,paid_at=now(),updated_at=now()
  where id=p_charge_id and tenant_id=p_tenant_id and status='awaiting_payment' returning id into changed;
  if changed is null then raise exception 'CRM setup charge unavailable';end if;
  insert into public.platform_audit_events(tenant_id,action,metadata)
  values(p_tenant_id,'crm_setup.payment_confirmed',jsonb_build_object('charge_id',changed,'amount_kzt',p_amount_kzt,'polar_order_id',p_order_id));
  return true;
end;
$$;
revoke all on function public.confirm_crm_setup_payment(text,text,jsonb,uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.confirm_crm_setup_payment(text,text,jsonb,uuid,uuid,text,integer) to service_role;
