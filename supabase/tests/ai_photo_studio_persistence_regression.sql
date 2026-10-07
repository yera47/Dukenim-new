-- NOT EXECUTED: requires local PostgreSQL/Supabase runtime.
-- Run in one transaction after promoting the draft through `supabase migration new`.
begin;
do $$
declare owner_a uuid:=gen_random_uuid(); owner_b uuid:=gen_random_uuid(); tenant_a uuid:=gen_random_uuid(); tenant_b uuid:=gen_random_uuid(); job_a uuid:=gen_random_uuid(); output_a uuid:=gen_random_uuid();
begin
  insert into auth.users(id,email) values(owner_a,owner_a||'@example.invalid'),(owner_b,owner_b||'@example.invalid');
  insert into public.tenants(id,slug,name,phone,status,plan,catalog_published) values
    (tenant_a,'photo-a-'||tenant_a,'Photo A','00000000000','active','standard',false),(tenant_b,'photo-b-'||tenant_b,'Photo B','00000000000','active','standard',false);
  insert into public.tenant_users(tenant_id,user_id,role) values(tenant_a,owner_a,'owner'),(tenant_b,owner_b,'owner');
  insert into public.ai_photo_jobs(id,tenant_id,requested_by,idempotency_key,scenario,generation_mode,status,source_object_path,original_reference_paths,instruction,output_count)
  values(job_a,tenant_a,owner_a,gen_random_uuid(),'product_photos','reference_guided','review',tenant_a||'/source.jpg',jsonb_build_array(tenant_a||'/front.jpg',tenant_a||'/back.jpg'),'Studio photo with soft light',4);
  insert into public.ai_photo_outputs(id,tenant_id,job_id,ordinal,image_object_path,detail_passport,automatic_checks)
  values(output_a,tenant_a,job_a,1,tenant_a||'/output-1.jpg','{"criticalDetails":["logo","seam"]}','{"passed":true}');
  perform set_config('test.owner_a',owner_a::text,true);perform set_config('test.owner_b',owner_b::text,true);perform set_config('test.tenant_a',tenant_a::text,true);perform set_config('test.job_a',job_a::text,true);perform set_config('test.output_a',output_a::text,true);
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.owner_a'),true);
do $$ begin
  if (select count(*) from public.ai_photo_jobs where tenant_id=current_setting('test.tenant_a')::uuid)<>1 then raise exception 'Owner cannot read own job';end if;
  perform set_config('request.jwt.claim.sub',current_setting('test.owner_b'),true);
  if exists(select 1 from public.ai_photo_jobs where tenant_id=current_setting('test.tenant_a')::uuid) then raise exception 'Cross-tenant job leak';end if;
  if exists(select 1 from public.ai_photo_outputs where tenant_id=current_setting('test.tenant_a')::uuid) then raise exception 'Cross-tenant output leak';end if;
  begin insert into public.ai_photo_jobs(tenant_id,requested_by,idempotency_key,scenario,generation_mode,source_object_path,instruction,output_count) values(current_setting('test.tenant_a')::uuid,current_setting('test.owner_b')::uuid,gen_random_uuid(),'product_photos','background_composite',current_setting('test.tenant_a')||'/bad.jpg','Unauthorized write',4);raise exception 'TEST FAILED direct write accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;

set local role service_role;
do $$ begin
  perform public.record_ai_photo_review(current_setting('test.tenant_a')::uuid,current_setting('test.job_a')::uuid,current_setting('test.output_a')::uuid,true,current_setting('test.owner_a')::uuid,'[]');
  if (select accepted_output_count from public.ai_photo_jobs where id=current_setting('test.job_a')::uuid)<>1 then raise exception 'Accepted count not atomic';end if;
  if (select count(*) from public.ai_photo_pack_ledger where job_id=current_setting('test.job_a')::uuid)<>1 then raise exception 'Pack ledger missing';end if;
  perform public.record_ai_photo_review(current_setting('test.tenant_a')::uuid,current_setting('test.job_a')::uuid,current_setting('test.output_a')::uuid,true,current_setting('test.owner_a')::uuid,'[]');
  if (select count(*) from public.ai_photo_pack_ledger where job_id=current_setting('test.job_a')::uuid)<>1 then raise exception 'Review replay duplicated quota';end if;
end $$;
reset role;
rollback;
