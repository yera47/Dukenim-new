create function public.review_sms_sender(p_tenant uuid,p_status text,p_reason text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_superadmin() then raise exception 'Forbidden';end if;
 if p_status not in ('approved','rejected','pending') or char_length(btrim(p_reason)) not between 3 and 1000 then raise exception 'Invalid review';end if;
 update public.tenant_sms_settings set sender_status=p_status,updated_at=now() where tenant_id=p_tenant and sender_id is not null;
 if not found then raise exception 'Sender not configured';end if;
 insert into public.platform_audit_events(actor_id,tenant_id,action,reason,metadata) values(auth.uid(),p_tenant,'sms.sender_reviewed',btrim(p_reason),jsonb_build_object('status',p_status));
 return true;
end $$;
revoke all on function public.review_sms_sender(uuid,text,text) from public,anon;
grant execute on function public.review_sms_sender(uuid,text,text) to authenticated;
