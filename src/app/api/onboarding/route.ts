import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { isPublicPlan, type PublicPlan } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { plan } = await request.json() as { plan?: PublicPlan };
    if (!isPublicPlan(plan)) return NextResponse.json({ error: "Выберите доступный тариф." }, { status: 400 });
    const { tenantId } = await requireRole(["owner", "superadmin"]);
    if (!tenantId) return NextResponse.json({ error: "Магазин не найден." }, { status: 400 });
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const client = await createClient();
      const { error } = await client.rpc("complete_onboarding", { p_tenant_id: tenantId, p_next_plan: plan });
      if (error) {
        const fallback = await client.from("tenants").update({ plan, next_plan: plan, onboarding_completed: true }).eq("id", tenantId);
        if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 400 });
      }
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Не удалось завершить настройку." }, { status: 500 });
  }
}
