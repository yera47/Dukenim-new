-- RLS protects the tenant row, but cannot distinguish owner-supplied request
-- details from connection status and server-side secret references.
create function public.guard_crm_request_client_write()
returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  -- Root operations use an authenticated superadmin; OAuth callbacks and
  -- verified provider workers use service_role. Neither is a merchant write.
  if current_user in ('postgres', 'service_role') or public.is_superadmin() then
    return new;
  end if;
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if new.status::text not in ('not_selected', 'details_later', 'credentials_needed', 'submitted') then
    raise exception 'Merchant cannot confirm an integration' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if old.status::text not in ('not_selected', 'details_later', 'credentials_needed', 'submitted') then
      raise exception 'Integration is under platform review' using errcode = '42501';
    end if;
    if new.id is distinct from old.id or new.tenant_id is distinct from old.tenant_id
      or new.provider is distinct from old.provider
      or new.preflight_summary is distinct from old.preflight_summary
      or new.safe_error is distinct from old.safe_error
      or new.secret_reference is distinct from old.secret_reference
      or new.assigned_to is distinct from old.assigned_to
      or new.created_at is distinct from old.created_at then
      raise exception 'Protected integration fields cannot be changed' using errcode = '42501';
    end if;
  elsif new.preflight_summary is not null or new.safe_error is not null
    or new.secret_reference is not null or new.assigned_to is not null then
    raise exception 'Protected integration fields cannot be set' using errcode = '42501';
  end if;
  if char_length(coalesce(new.account_url, '')) > 300
    or char_length(coalesce(new.admin_contact, '')) > 160
    or char_length(coalesce(new.notes, '')) > 1200 then
    raise exception 'Integration request is too long' using errcode = '22001';
  end if;
  new.submitted_at := case when new.status = 'submitted' then now() else null end;
  new.last_status_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger guard_crm_request_client_write
before insert or update on public.crm_integration_requests
for each row execute function public.guard_crm_request_client_write();

revoke all on function public.guard_crm_request_client_write() from public, anon, authenticated;
revoke all on table public.crm_integration_requests from anon;

-- The merchant and root UI select named columns. Keep the vault reference out
-- of every authenticated Data API response, including select=*.
revoke select on table public.crm_integration_requests from authenticated;
grant select (id, tenant_id, provider, account_url, admin_contact,
  sync_direction, notes, status, preflight_summary, safe_error, assigned_to,
  submitted_at, last_status_at, created_at, updated_at)
on table public.crm_integration_requests to authenticated;
