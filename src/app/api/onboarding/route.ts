import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { isPublicPlan, type PublicPlan } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { BusinessVertical } from "@/types/database";

const validVerticals = new Set<BusinessVertical>(["fashion", "beauty", "food", "flowers", "services", "event", "home", "other"]);

export async function POST(request: Request) {
  try {
    const { plan, businessVertical, storefrontFormat } = await request.json() as { plan?: PublicPlan; businessVertical?: unknown; storefrontFormat?: unknown };
    if (!isPublicPlan(plan)) return NextResponse.json({ error: "Выберите доступный тариф." }, { status: 400 });
    const vertical = typeof businessVertical === "string" && validVerticals.has(businessVertical as BusinessVertical) ? businessVertical as BusinessVertical : null;
    const format = storefrontFormat === "one_page" ? "one_page" : "catalog";
    const { tenantId } = await requireRole(["owner", "superadmin"]);
    if (!tenantId) return NextResponse.json({ error: "Магазин не найден." }, { status: 400 });
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const client = await createClient();
      const { error } = await client.rpc("complete_onboarding", { p_tenant_id: tenantId, p_next_plan: plan });
      if (error) {
        const fallback = await client.from("tenants").update({ plan, next_plan: plan, onboarding_completed: true }).eq("id", tenantId);
        if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 400 });
      }
      if (vertical) await client.from("tenants").update({ business_vertical: vertical, storefront_format: format }).eq("id", tenantId);
      else await client.from("tenants").update({ storefront_format: format }).eq("id", tenantId);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Не удалось завершить настройку." }, { status: 500 });
  }
}
