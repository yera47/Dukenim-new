-- Merchant-operated Kaspi Pay remote invoices and payment links. Dukenim never
-- creates a Kaspi payment or treats opening a link as proof of payment.
alter table public.tenant_settings
  add column kaspi_remote_enabled boolean not null default false,
  add column kaspi_remote_link text;

alter table public.tenant_settings add constraint tenant_settings_kaspi_link_check
  check (kaspi_remote_link is null or (length(kaspi_remote_link) <= 500
    and kaspi_remote_link ~ '^https://(kaspi\.kz|([a-z0-9-]+\.)+kaspi\.kz)/[^[:space:]]*$'));

alter table public.orders add column kaspi_invoice_sent_at timestamptz;

create function public.guard_kaspi_remote_settings() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.kaspi_remote_enabled is not distinct from old.kaspi_remote_enabled
    and new.kaspi_remote_link is not distinct from old.kaspi_remote_link then return new; end if;
  if not public.is_superadmin() and not exists(
    select 1 from public.tenant_users u where u.tenant_id=new.tenant_id and u.user_id=auth.uid() and u.role='owner'
  ) then raise exception 'Owner access required'; end if;
  insert into public.platform_audit_events(actor_id,tenant_id,action,metadata)
    values(auth.uid(),new.tenant_id,'kaspi.remote.settings',jsonb_build_object('enabled',new.kaspi_remote_enabled,'has_link',new.kaspi_remote_link is not null));
  return new;
end $$;
revoke all on function public.guard_kaspi_remote_settings() from public,anon,authenticated;
create trigger guard_kaspi_remote_settings before update of kaspi_remote_enabled,kaspi_remote_link
  on public.tenant_settings for each row execute function public.guard_kaspi_remote_settings();

create function public.guard_unpaid_kaspi_fulfilment() returns trigger language plpgsql set search_path='' as $$
begin
  if new.payment_method='kaspi' and new.status is distinct from old.status
    and new.status in ('assembled','delivering','done') and new.payment_status<>'paid'
    then raise exception 'Confirm Kaspi payment before fulfilment'; end if;
  return new;
end $$;
revoke all on function public.guard_unpaid_kaspi_fulfilment() from public,anon,authenticated;
create trigger guard_unpaid_kaspi_fulfilment before update of status
  on public.orders for each row execute function public.guard_unpaid_kaspi_fulfilment();

-- The actual checkout function is server-only. Its current cash guard is
-- replaced only if the expected version is present, so schema drift fails the migration.
do $migration$
declare definition text; old_guard text := 'if p_payment_method <> ''cash'' then raise exception ''Payment method unavailable''; end if;';
begin
  select pg_get_functiondef(p.oid) into definition from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='create_storefront_order_v3';
  if definition is null or position(old_guard in definition)=0 then
    raise exception 'Unexpected checkout function version';
  end if;
  execute replace(definition,old_guard,
    'if p_payment_method not in (''cash'',''kaspi'') then raise exception ''Payment method unavailable''; end if;
     if p_payment_method=''kaspi'' and not exists (
       select 1 from public.tenant_settings s where s.tenant_id=p_tenant_id and s.kaspi_remote_enabled
     ) then raise exception ''Kaspi remote unavailable''; end if;');
end $migration$;

create function public.manage_kaspi_remote_order(p_order uuid,p_action text,p_reference text default null)
returns text language plpgsql security definer set search_path='' as $$
declare existing public.orders%rowtype; reference_text text := btrim(coalesce(p_reference,''));
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into existing from public.orders where id=p_order for update;
  if not found or existing.payment_method<>'kaspi' or not (
    public.is_superadmin() or exists(select 1 from public.tenant_users u
      where u.tenant_id=existing.tenant_id and u.user_id=auth.uid() and u.role='owner')
  ) then raise exception 'Order unavailable'; end if;
  if p_action not in ('invoice_sent','paid','refunded') then raise exception 'Invalid action'; end if;
  if p_action in ('paid','refunded') and (length(reference_text) not between 4 and 100 or reference_text ~ '[[:cntrl:]]')
    then raise exception 'Enter Kaspi transaction reference'; end if;
  if p_action='invoice_sent' then
    if existing.payment_status<>'pending' or existing.status='cancelled' then raise exception 'Invoice unavailable'; end if;
    update public.orders set kaspi_invoice_sent_at=now() where id=p_order;
  elsif p_action='paid' then
    if existing.payment_status<>'pending' or existing.status='cancelled' then raise exception 'Payment transition unavailable'; end if;
    update public.orders set payment_status='paid' where id=p_order;
  else
    if existing.payment_status<>'paid' then raise exception 'Refund transition unavailable'; end if;
    update public.orders set payment_status='refunded' where id=p_order;
  end if;
  insert into public.platform_audit_events(actor_id,tenant_id,action,metadata)
    values(auth.uid(),existing.tenant_id,'kaspi.remote.'||p_action,
      jsonb_build_object('order_id',p_order,'order_number',existing.order_number,'total',existing.total,'reference',nullif(reference_text,'')));
  return p_action;
end $$;
revoke all on function public.manage_kaspi_remote_order(uuid,text,text) from public,anon,authenticated;
grant execute on function public.manage_kaspi_remote_order(uuid,text,text) to authenticated;
