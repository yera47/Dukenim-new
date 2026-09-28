alter table public.field_sales_leads
  add column if not exists reminder_type text not null default 'task'
    check (reminder_type in ('call','meeting','task')),
  add column if not exists reminder_completed_at timestamptz;

drop index if exists public.field_sales_leads_reminder_idx;
create index field_sales_leads_open_reminder_idx
  on public.field_sales_leads(reminder_at)
  where reminder_at is not null and reminder_completed_at is null;
