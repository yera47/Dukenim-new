import fs from "node:fs";
import path from "node:path";

const target = process.argv[2];
if (!target) throw new Error("Pass target migration path");
const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "outputs/astana_sales_zones_20260928/leads_raw.json"), "utf8"));
const leads = raw.items.filter((x) => Number.isFinite(x.lon) && Number.isFinite(x.lat)).map((x) => ({ ...x, external_id: String(x.id), longitude: Number(x.lon), latitude: Number(x.lat) }));

function split(items) {
  if (items.length <= 20) return [items];
  const lon = items.map((x) => x.longitude), lat = items.map((x) => x.latitude);
  const key = (Math.max(...lon) - Math.min(...lon)) * 69.5 > (Math.max(...lat) - Math.min(...lat)) * 111 ? "longitude" : "latitude";
  const sorted = [...items].sort((a, b) => a[key] - b[key]);
  const cut = Math.max(1, Math.min(sorted.length - 1, Math.round(sorted.length / 40) * 20));
  return [...split(sorted.slice(0, cut)), ...split(sorted.slice(cut))];
}

const groups = split(leads).sort((a, b) => {
  const center = (xs, key) => xs.reduce((sum, x) => sum + x[key], 0) / xs.length;
  const lat = center(b, "latitude") - center(a, "latitude");
  return Math.abs(lat) > .002 ? lat : center(a, "longitude") - center(b, "longitude");
});
const street = (items) => {
  const counts = new Map();
  for (const item of items) {
    const name = String(item.address || "Астана").replace(/^(улица|проспект|шоссе|переулок)\s+/i, "").split(",")[0].trim() || "Астана";
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] || "Астана";
};
const zones = groups.map((items, index) => ({
  id: `Z${String(index + 1).padStart(3, "0")}`, name: `Квартал ${String(index + 1).padStart(3, "0")} · ${street(items)}`, items,
  west: Math.min(...items.map(x => x.longitude)) - .00045, east: Math.max(...items.map(x => x.longitude)) + .00045,
  south: Math.min(...items.map(x => x.latitude)) - .00045, north: Math.max(...items.map(x => x.latitude)) + .00045,
}));
const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const cleanUrl = (value, kind) => {
  const input = String(value || "").trim();
  if (!input) return null;
  if (/^https?:\/\//i.test(input)) return input;
  return kind === "instagram" ? `https://instagram.com/${input.replace(/^@/, "")}` : kind === "whatsapp" ? `https://wa.me/${input.replace(/\D/g, "")}` : `https://${input}`;
};
const records = leads.map((x) => ({
  external_source: "2gis", external_id: x.external_id, name: String(x.name || "").slice(0, 240), address: String(x.address || ""),
  segment: String(x.segment || "Другое"), subsegment: String(x.subsegment || x.primary_rubric || ""), longitude: x.longitude, latitude: x.latitude,
  phone: String(x.phone || "").trim() || null, instagram_url: cleanUrl(x.instagram, "instagram"), website_url: cleanUrl(x.website), whatsapp_url: cleanUrl(x.whatsapp, "whatsapp"),
  map_url: cleanUrl(x.map_url), schedule: String(x.schedule || "").trim() || null, rating: Number.isFinite(Number(x.rating)) ? Number(x.rating) : null,
  review_count: Math.max(0, Number(x.review_count) || 0), branch_count: Math.max(0, Number(x.branch_count) || 0),
  priority_score: Math.max(0, Math.min(100, Number(x.priority_score ?? x.preliminary_score) || 0)), priority: String(x.priority || "B — следующий приоритет"),
}));
const zoneValues = zones.map((z, i) => `(${q(z.id)},${q(z.name)},${q(`Сектор 2ГИС · ${z.items.length} заведений`)},${z.west.toFixed(6)},${z.east.toFixed(6)},${z.south.toFixed(6)},${z.north.toFixed(6)},${i + 1},true)`).join(",\n");
const mapValues = zones.flatMap(z => z.items.map(x => `(${q(x.external_id)},${q(z.id)})`)).join(",\n");
const payload = JSON.stringify(records).replaceAll("$leads$", "");

const sql = `-- Compact 2GIS sectors and persisted field trips.\ncreate table public.field_sales_trips(id uuid primary key default gen_random_uuid(),zone_id text not null references public.field_sales_zones(id) on update cascade,actor_id uuid references auth.users(id) on delete set null,status text not null default 'active' check(status in ('active','completed','cancelled')),started_at timestamptz not null default now(),completed_at timestamptz,created_at timestamptz not null default now());\ncreate table public.field_sales_trip_stops(id uuid primary key default gen_random_uuid(),trip_id uuid not null references public.field_sales_trips(id) on delete cascade,lead_id uuid not null references public.field_sales_leads(id) on delete cascade,position integer not null check(position>0),state text not null default 'queued' check(state in ('queued','current','completed','skipped')),outcome text check(outcome is null or outcome in ('interested','follow_up','not_available','refused','connected')),feedback text not null default '',opened_at timestamptz,completed_at timestamptz,created_at timestamptz not null default now(),unique(trip_id,position),unique(trip_id,lead_id));\ncreate unique index field_sales_one_active_trip on public.field_sales_trips(actor_id) where status='active';\ncreate index field_sales_trip_stops_trip_idx on public.field_sales_trip_stops(trip_id,position);\nalter table public.field_sales_trips enable row level security; alter table public.field_sales_trip_stops enable row level security; revoke all on table public.field_sales_trips from public,anon,authenticated; revoke all on table public.field_sales_trip_stops from public,anon,authenticated;\ninsert into public.field_sales_zones(id,name,road_boundaries,west,east,south,north,sort_order,active) values\n${zoneValues}\non conflict(id) do update set name=excluded.name,road_boundaries=excluded.road_boundaries,west=excluded.west,east=excluded.east,south=excluded.south,north=excluded.north,sort_order=excluded.sort_order,active=true;\nwith source as(select * from jsonb_to_recordset($leads$${payload}$leads$::jsonb) as x(external_source text,external_id text,name text,address text,segment text,subsegment text,longitude numeric,latitude numeric,phone text,instagram_url text,website_url text,whatsapp_url text,map_url text,schedule text,rating numeric,review_count integer,branch_count integer,priority_score integer,priority text)) insert into public.field_sales_leads(external_source,external_id,zone_id,name,address,segment,subsegment,longitude,latitude,phone,instagram_url,website_url,whatsapp_url,map_url,schedule,rating,review_count,branch_count,priority_score,priority) select external_source,external_id,'Z001',name,address,segment,subsegment,longitude,latitude,phone,instagram_url,website_url,whatsapp_url,map_url,schedule,rating,review_count,branch_count,priority_score,priority from source on conflict(external_source,external_id) do update set name=excluded.name,address=excluded.address,segment=excluded.segment,subsegment=excluded.subsegment,longitude=excluded.longitude,latitude=excluded.latitude,phone=coalesce(excluded.phone,field_sales_leads.phone),instagram_url=coalesce(excluded.instagram_url,field_sales_leads.instagram_url),website_url=coalesce(excluded.website_url,field_sales_leads.website_url),whatsapp_url=coalesce(excluded.whatsapp_url,field_sales_leads.whatsapp_url),map_url=excluded.map_url,schedule=excluded.schedule,rating=excluded.rating,review_count=excluded.review_count,branch_count=excluded.branch_count,priority_score=excluded.priority_score,priority=excluded.priority;\nwith mapping(external_id,zone_id) as(values\n${mapValues}\n) update public.field_sales_leads l set zone_id=m.zone_id,route_day=null,route_position=null from mapping m where l.external_source='2gis' and l.external_id=m.external_id;\ndelete from public.field_sales_zones z where z.id in('Z1','Z2','Z3') and not exists(select 1 from public.field_sales_leads l where l.zone_id=z.id);`;
fs.writeFileSync(target, sql, "utf8");
console.log(`Prepared ${zones.length} zones for ${leads.length} leads; ${Math.min(...groups.map(x => x.length))}-${Math.max(...groups.map(x => x.length))} each.`);
