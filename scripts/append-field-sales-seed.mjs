import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "outputs", "astana_sales_zones_20260928", "leads_raw.json");
const migration = path.join(root, "supabase", "migrations", "20260928083817_root_field_sales_crm.sql");
const data = JSON.parse(fs.readFileSync(source, "utf8"));
const zones = [
  { id: "Z1", west: 71.4164, east: 71.449, south: 51.122, north: 51.132 },
  { id: "Z2", west: 71.4164, east: 71.449, south: 51.112, north: 51.122 },
  { id: "Z3", west: 71.4164, east: 71.449, south: 51.1025, north: 51.112 },
];

const cleanUrl = (value, kind) => {
  const input = String(value ?? "").trim();
  if (!input) return null;
  if (/^https?:\/\//i.test(input)) return input;
  if (kind === "instagram") return `https://instagram.com/${input.replace(/^@/, "")}`;
  if (kind === "whatsapp") return `https://wa.me/${input.replace(/\D/g, "")}`;
  return `https://${input}`;
};

const records = [];
for (const item of data.items) {
  const zone = zones.find((candidate) => item.lon >= candidate.west && item.lon <= candidate.east && item.lat >= candidate.south && item.lat <= candidate.north);
  if (!zone) continue;
  records.push({
    external_source: "2gis",
    external_id: String(item.id),
    zone_id: zone.id,
    name: String(item.name ?? "").slice(0, 240),
    address: String(item.address ?? ""),
    segment: String(item.segment ?? "Другое"),
    subsegment: String(item.subsegment ?? item.primary_rubric ?? ""),
    longitude: Number(item.lon),
    latitude: Number(item.lat),
    phone: String(item.phone ?? "").trim() || null,
    instagram_url: cleanUrl(item.instagram, "instagram"),
    website_url: cleanUrl(item.website, "website"),
    whatsapp_url: cleanUrl(item.whatsapp, "whatsapp"),
    map_url: cleanUrl(item.map_url, "website"),
    schedule: String(item.schedule ?? "").trim() || null,
    rating: Number.isFinite(Number(item.rating)) ? Number(item.rating) : null,
    review_count: Math.max(0, Number(item.review_count) || 0),
    branch_count: Math.max(0, Number(item.branch_count) || 0),
    priority_score: Math.max(0, Math.min(100, Number(item.priority_score ?? item.preliminary_score) || 0)),
    priority: String(item.priority ?? "B — следующий приоритет"),
  });
}

const payload = JSON.stringify(records).replaceAll("$sales$", "");
const sql = `

-- Public directory facts captured from 2GIS on 2026-09-28. Contact and deal
-- notes are intentionally absent; operators add them inside the private CRM.
with source as (
  select * from jsonb_to_recordset($sales$${payload}$sales$::jsonb) as x(
    external_source text, external_id text, zone_id text, name text, address text,
    segment text, subsegment text, longitude numeric, latitude numeric, phone text,
    instagram_url text, website_url text, whatsapp_url text, map_url text,
    schedule text, rating numeric, review_count integer, branch_count integer,
    priority_score integer, priority text
  )
)
insert into public.field_sales_leads (
  external_source,external_id,zone_id,name,address,segment,subsegment,longitude,latitude,
  phone,instagram_url,website_url,whatsapp_url,map_url,schedule,rating,review_count,
  branch_count,priority_score,priority
)
select external_source,external_id,zone_id,name,address,segment,subsegment,longitude,latitude,
  phone,instagram_url,website_url,whatsapp_url,map_url,schedule,rating,review_count,
  branch_count,priority_score,priority
from source
on conflict (external_source,external_id) do update set
  zone_id=excluded.zone_id,name=excluded.name,address=excluded.address,segment=excluded.segment,
  subsegment=excluded.subsegment,longitude=excluded.longitude,latitude=excluded.latitude,
  phone=coalesce(excluded.phone,public.field_sales_leads.phone),
  instagram_url=coalesce(excluded.instagram_url,public.field_sales_leads.instagram_url),
  website_url=coalesce(excluded.website_url,public.field_sales_leads.website_url),
  whatsapp_url=coalesce(excluded.whatsapp_url,public.field_sales_leads.whatsapp_url),
  map_url=excluded.map_url,schedule=excluded.schedule,rating=excluded.rating,
  review_count=excluded.review_count,branch_count=excluded.branch_count,
  priority_score=excluded.priority_score,priority=excluded.priority;
`;

const existing = fs.readFileSync(migration, "utf8").replace(/\n-- Public directory facts captured[\s\S]*$/m, "");
fs.writeFileSync(migration, existing + sql, "utf8");
console.log(`Prepared ${records.length} leads across ${zones.length} road-bounded zones.`);
