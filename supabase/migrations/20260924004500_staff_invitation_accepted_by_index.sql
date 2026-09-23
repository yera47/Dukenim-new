create index if not exists staff_invitations_accepted_by_idx
  on public.staff_invitations (accepted_by)
  where accepted_by is not null;
