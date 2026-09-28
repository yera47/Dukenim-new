create index if not exists field_sales_activities_actor_idx on public.field_sales_activities(actor_id) where actor_id is not null;
create index if not exists field_sales_leads_assigned_idx on public.field_sales_leads(assigned_to) where assigned_to is not null;
create index if not exists field_sales_trip_stops_lead_idx on public.field_sales_trip_stops(lead_id);
create index if not exists field_sales_trips_zone_idx on public.field_sales_trips(zone_id);
