create or replace function public.activate_subscription(p_tenant_id uuid,p_plan public.plan_type,p_period_end timestamptz)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid;
begin
 if p_tenant_id not in(select public.user_tenant_ids()) and not public.is_superadmin() then raise exception 'Forbidden';end if;
 update public.subscriptions set status='canceled' where tenant_id=p_tenant_id and status='active';
 insert into public.subscriptions(tenant_id,plan,status,started_at,current_period_end) values(p_tenant_id,p_plan,'active',now(),p_period_end) returning id into v_id;
 update public.tenants set plan=p_plan,status='active' where id=p_tenant_id;return v_id;
end;$$;
grant execute on function public.activate_subscription(uuid,public.plan_type,timestamptz) to authenticated;
