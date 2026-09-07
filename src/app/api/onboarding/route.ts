import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { isPublicPlan, type PublicPlan } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { isLaunchVertical } from "@/lib/launch-verticals";

export async function POST(request: Request) {
  try {
    const { plan, businessVertical, storefrontFormat, billingPeriod } = await request.json() as { plan?: PublicPlan; businessVertical?: unknown; storefrontFormat?: unknown; billingPeriod?: unknown };
    if (!isPublicPlan(plan)) return NextResponse.json({ error: "Выберите доступный тариф." }, { status: 400 });
    if (!isLaunchVertical(businessVertical)) return NextResponse.json({ error: "Выберите доступный тип торговли. Запись на услуги и продажа билетов пока не подключены." }, { status: 400 });
    if (storefrontFormat !== "catalog" && storefrontFormat !== "one_page") return NextResponse.json({ error: "Выберите формат витрины." }, { status: 400 });
    if (billingPeriod !== "monthly" && billingPeriod !== "annual") return NextResponse.json({ error: "Выберите период оплаты." }, { status: 400 });
    const { tenantId } = await requireRole(["owner", "superadmin"]);
    if (!tenantId) return NextResponse.json({ error: "Магазин не найден." }, { status: 400 });
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const client = await createClient();
      const { error } = await client.rpc("complete_onboarding_v2", { p_tenant_id: tenantId, p_next_plan: plan, p_business_vertical: businessVertical, p_storefront_format: storefrontFormat, p_preferred_billing_period: billingPeriod });
      if (error) return NextResponse.json({ error: "Не удалось сохранить настройки запуска. Обновите страницу и попробуйте ещё раз." }, { status: 503 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Не удалось завершить настройку." }, { status: 500 });
  }
}
