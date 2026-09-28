import { NextRequest, NextResponse } from "next/server";
import { requireFieldSalesAccess } from "@/lib/field-sales-access.server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await requireFieldSalesAccess();
  const zoneId = request.nextUrl.searchParams.get("zone") ?? "";
  if (!/^Z\d{3}$/.test(zoneId)) return new NextResponse("Invalid zone", { status: 400 });
  const { data: zone } = await createAdminClient().from("field_sales_zones").select("west,east,south,north").eq("id", zoneId).maybeSingle();
  if (!zone) return new NextResponse("Zone not found", { status: 404 });
  const key = process.env.DGIS_API_KEY;
  if (!key) return new NextResponse("2GIS map key is not configured", { status: 503 });

  const west = Number(zone.west), east = Number(zone.east), south = Number(zone.south), north = Number(zone.north);
  const span = Math.max(east - west, north - south);
  const zoom = span < .0025 ? 17 : span < .005 ? 16 : span < .01 ? 15 : 14;
  const polygon = [[south,west],[north,west],[north,east],[south,east],[south,west]].map(([lat,lon]) => `${lat},${lon}`).join(",");
  const params = new URLSearchParams({
    s: "1200x760",
    c: `${(south + north) / 2},${(west + east) / 2}`,
    z: String(zoom),
    pn: `${polygon}~c:13251f~f:b9904a33`,
    key,
  });
  const response = await fetch(`https://static.maps.2gis.com/2.0?${params}`, { cache: "no-store" });
  if (!response.ok) return new NextResponse("2GIS map unavailable", { status: 502 });
  return new NextResponse(response.body, { headers: { "Content-Type": response.headers.get("content-type") ?? "image/png", "Cache-Control": "private, max-age=300" } });
}
