-- DRAFT ONLY. Not a migration and not applied anywhere.
-- Superseded for generation/credit settlement by 20261009181408_ai_product_photo_generation_ledger.sql.
-- Create a real timestamped migration with `supabase migration new` before release.

create table public.ai_photo_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  idempotency_key uuid not null,
  scenario text not null check (scenario in ('product_photos','catalog_hero','story_promo')),
  generation_mode text not null check (generation_mode in ('background_composite','reference_guided')),
  status text not null default 'draft' check (status in ('draft','queued','processing','review','partially_approved','approved','failed','canceled')),
  source_object_path text not null check (source_object_path like tenant_id::text || '/%'),
  original_reference_paths jsonb not null default '[]'::jsonb check (jsonb_typeof(original_reference_paths)='array'),
  instruction text not null check (char_length(btrim(instruction)) between 8 and 500),
  merchant_facts jsonb not null default '{}'::jsonb check (jsonb_typeof(merchant_facts)='object'),
  output_count smallint not null check (output_count between 2 and 5),
  accepted_output_count smallint not null default 0 check (accepted_output_count between 0 and output_count),
  provider_key text,
  provider_request_id text,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,idempotency_key),
  unique (tenant_id,id)
);

create table public.ai_photo_outputs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  job_id uuid not null,
  ordinal smallint not null check (ordinal between 1 and 5),
  status text not null default 'draft' check (status in ('draft','approved','rejected','failed')),
  image_object_path text check (image_object_path is null or image_object_path like tenant_id::text || '/%'),
  illustration_layer jsonb not null default '{}'::jsonb check (jsonb_typeof(illustration_layer)='object'),
  text_layer jsonb not null default '{}'::jsonb check (jsonb_typeof(text_layer)='object'),
  detail_passport jsonb not null default '{}'::jsonb check (jsonb_typeof(detail_passport)='object'),
  automatic_checks jsonb not null default '{}'::jsonb check (jsonb_typeof(automatic_checks)='object'),
  failed_critical_details jsonb not null default '[]'::jsonb check (jsonb_typeof(failed_critical_details)='array'),
  manually_reviewed_by uuid references auth.users(id),
  manually_reviewed_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id,ordinal),
  foreign key (tenant_id,job_id) references public.ai_photo_jobs(tenant_id,id) on delete cascade,
  check ((status='approved') = (manually_reviewed_by is not null and manually_reviewed_at is not null)),
  check (status<>'approved' or jsonb_array_length(failed_critical_details)=0),
  check (applied_at is null or status='approved')
);

create table public.ai_photo_pack_ledger (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  job_id uuid not null,
  accepted_outputs smallint not null check (accepted_outputs between 1 and 5),
  recorded_at timestamptz not null default now(),
  unique (tenant_id,job_id),
  foreign key (tenant_id,job_id) references public.ai_photo_jobs(tenant_id,id) on delete cascade
);

create index ai_photo_jobs_tenant_created_idx on public.ai_photo_jobs(tenant_id,created_at desc);
create index ai_photo_outputs_tenant_job_idx on public.ai_photo_outputs(tenant_id,job_id);
create index ai_photo_pack_ledger_tenant_recorded_idx on public.ai_photo_pack_ledger(tenant_id,recorded_at desc);

alter table public.ai_photo_jobs enable row level security;
alter table public.ai_photo_outputs enable row level security;
alter table public.ai_photo_pack_ledger enable row level security;

revoke all on public.ai_photo_jobs,public.ai_photo_outputs,public.ai_photo_pack_ledger from public,anon,authenticated;
grant select on public.ai_photo_jobs,public.ai_photo_outputs,public.ai_photo_pack_ledger to authenticated;
grant all on public.ai_photo_jobs,public.ai_photo_outputs,public.ai_photo_pack_ledger to service_role;

create policy ai_photo_jobs_owner_read on public.ai_photo_jobs for select to authenticated
using (exists(select 1 from public.tenant_users u where u.tenant_id=ai_photo_jobs.tenant_id and u.user_id=(select auth.uid()) and u.role='owner'));
create policy ai_photo_outputs_owner_read on public.ai_photo_outputs for select to authenticated
using (exists(select 1 from public.tenant_users u where u.tenant_id=ai_photo_outputs.tenant_id and u.user_id=(select auth.uid()) and u.role='owner'));
create policy ai_photo_pack_ledger_owner_read on public.ai_photo_pack_ledger for select to authenticated
using (exists(select 1 from public.tenant_users u where u.tenant_id=ai_photo_pack_ledger.tenant_id and u.user_id=(select auth.uid()) and u.role='owner'));

create or replace function public.record_ai_photo_review(
  p_tenant_id uuid,
  p_job_id uuid,
  p_output_id uuid,
  p_approve boolean,
  p_reviewer_id uuid,
  p_failed_details jsonb default '[]'::jsonb
) returns public.ai_photo_outputs
language plpgsql
security definer
set search_path=''
as $$
declare v_output public.ai_photo_outputs; v_accepted smallint;
begin
  if jsonb_typeof(p_failed_details) is distinct from 'array' then raise exception 'Invalid failed details'; end if;
  select * into v_output from public.ai_photo_outputs where id=p_output_id and tenant_id=p_tenant_id and job_id=p_job_id for update;
  if not found then raise exception 'Output not found'; end if;
  if p_approve and (jsonb_array_length(p_failed_details)>0 or coalesce((v_output.automatic_checks->>'passed')::boolean,false) is not true) then
    raise exception 'Critical detail checks failed';
  end if;
  update public.ai_photo_outputs set status=case when p_approve then 'approved' else 'rejected' end,
    failed_critical_details=p_failed_details,manually_reviewed_by=p_reviewer_id,manually_reviewed_at=now(),updated_at=now()
  where id=p_output_id and tenant_id=p_tenant_id returning * into v_output;
  select count(*)::smallint into v_accepted from public.ai_photo_outputs where tenant_id=p_tenant_id and job_id=p_job_id and status='approved';
  update public.ai_photo_jobs set accepted_output_count=v_accepted,
    status=case when v_accepted=output_count then 'approved' when v_accepted>0 then 'partially_approved' else 'review' end,updated_at=now()
  where id=p_job_id and tenant_id=p_tenant_id;
  if v_accepted>0 then insert into public.ai_photo_pack_ledger(tenant_id,job_id,accepted_outputs)
    values(p_tenant_id,p_job_id,v_accepted) on conflict(tenant_id,job_id) do update set accepted_outputs=excluded.accepted_outputs; end if;
  return v_output;
end;
$$;

revoke all on function public.record_ai_photo_review(uuid,uuid,uuid,boolean,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.record_ai_photo_review(uuid,uuid,uuid,boolean,uuid,jsonb) to service_role;
