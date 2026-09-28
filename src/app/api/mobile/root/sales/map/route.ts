import { NextResponse } from "next/server";
import { getMobileRoot } from "@/lib/mobile-auth";

export async function GET(request: Request) {
  const root = await getMobileRoot(request);
  if (!root) return new NextResponse("Forbidden", { status: 403 });
  const zoneId = new URL(request.url).searchParams.get("zone") ?? "";
  if (!/^Z\d{3}$/.test(zoneId)) return new NextResponse("Invalid zone", { status: 400 });
  const { data: zone, error } = await root.admin.from("field_sales_zones")
    .select("west,east,south,north").eq("id", zoneId).eq("active", true).maybeSingle();
  if (error || !zone) return new NextResponse("Zone not found", { status: 404 });
  const key = process.env.DGIS_API_KEY;
  if (!key) return new NextResponse("Map unavailable", { status: 503 });
  const west = Number(zone.west), east = Number(zone.east), south = Number(zone.south), north = Number(zone.north);
  const span = Math.max(east - west, north - south);
  const zoom = span < .0025 ? 17 : span < .005 ? 16 : span < .01 ? 15 : 14;
  const polygon = [[south, west], [north, west], [north, east], [south, east], [south, west]].map(([lat, lon]) => `${lat},${lon}`).join(",");
  const params = new URLSearchParams({ s: "1200x760", c: `${(south + north) / 2},${(west + east) / 2}`, z: String(zoom), pn: `${polygon}~c:13251f~f:b9904a33`, key });
  const response = await fetch(`https://static.maps.2gis.com/2.0?${params}`, { cache: "no-store" });
  if (!response.ok) return new NextResponse("Map unavailable", { status: 502 });
  return new NextResponse(response.body, { headers: { "Content-Type": response.headers.get("content-type") ?? "image/png", "Cache-Control": "private, max-age=300" } });
}
