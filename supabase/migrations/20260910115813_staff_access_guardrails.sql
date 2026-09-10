create function public.staff_directory() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',t.name)),'[]'::jsonb) from public.staff_access s join public.tenants t on t.id=s.tenant_id where s.user_id=auth.uid() and s.active;
$$;
revoke all on function public.staff_directory() from public,anon;
grant execute on function public.staff_directory() to authenticated;
do $$
declare signature text; definition text;
begin
 foreach signature in array array['public.staff_module_data(uuid,text)','public.staff_edit(uuid,text,uuid,jsonb)'] loop
  definition:=pg_get_functiondef(signature::regprocedure);
  definition:=replace(definition,'if member.id is null or','if member.id is null or (p_module in (''stock'',''customers'',''analytics'') and not exists(select 1 from public.tenants t where t.id=member.tenant_id and (case when t.status=''trial'' then coalesce(t.next_plan,t.plan) else t.plan end)::text<>''basic'')) or');
  execute definition;
 end loop;
end $$;
