import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

function csvCell(value: string | null | undefined) {
  const safe = (value ?? "").replace(/^[\s\uFEFF]*[=+\-@]/, "'$&");
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET() {
  await requireRole(["superadmin"]);
  const client = createAdminClient();
  const rows: Array<{ created_at: string; tenant_id: string | null; actor_id: string | null; action: string; reason: string | null }> = [];
  for (let start = 0; start < 10_000; start += 1000) {
    const result = await client.from("platform_audit_events").select("created_at,tenant_id,actor_id,action,reason").order("created_at", { ascending: false }).range(start, start + 999);
    if (result.error) return NextResponse.json({ error: "Не удалось выгрузить аудит." }, { status: 500 });
    rows.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 1000) break;
  }
  const header = ["created_at","tenant_id","actor_id","action","reason"].join(",");
  const body = rows.map(row => [row.created_at,row.tenant_id,row.actor_id,row.action,row.reason].map(csvCell).join(",")).join("\r\n");
  return new NextResponse(`\uFEFF${header}\r\n${body}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="dukenim-audit-${new Date().toISOString().slice(0,10)}.csv"`, "Cache-Control": "private, no-store" } });
}
