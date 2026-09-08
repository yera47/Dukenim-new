-- Ticket ids are provider acknowledgements, never proof of display on a phone.
alter table public.mobile_notification_outbox
  add column claimed_at timestamptz,
  add column expo_tickets jsonb not null default '[]'::jsonb
    check (jsonb_typeof(expo_tickets)='array' and jsonb_array_length(expo_tickets)<=100),
  add column receipt_state text not null default 'pending'
    check (receipt_state in ('pending','accepted','failed','unknown'));
create index mobile_notification_receipt_pending_idx
  on public.mobile_notification_outbox (sent_at)
  where status='sent' and receipt_state='pending';
create index mobile_notification_processing_idx
  on public.mobile_notification_outbox (claimed_at)
  where status='processing';
-- Existing owner SELECT / service-role write permissions remain unchanged.
