import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPublicPlan, type Plan } from "@/lib/plans";
import { normalizePromotionCode, quotePromotion, type BillingPeriod } from "@/lib/subscription-promotions";

type Body = { plan?: unknown; billingPeriod?: unknown; promoCode?: unknown };

export async function POST(request: Request) {
  try {
    const { plan, billingPeriod, promoCode } = await request.json() as Body;
    if (!isPublicPlan(plan)) return NextResponse.json({ error: "Неизвестный тариф" }, { status: 400 });
    if (billingPeriod !== "monthly" && billingPeriod !== "annual") return NextResponse.json({ error: "Выберите период оплаты" }, { status: 400 });
    const { tenantId } = await requireRole(["owner", "superadmin"]);
    if (!tenantId) return NextResponse.json({ error: "Магазин не привязан к аккаунту" }, { status: 400 });
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Подключение тарифа временно недоступно. Попробуйте позже." }, { status: 503 });

    const client = createAdminClient();
    const normalizedCode = normalizePromotionCode(promoCode);
    if (String(promoCode ?? "").trim() && !normalizedCode) return NextResponse.json({ error: "Проверьте формат промокода." }, { status: 400 });
    const quote = await quotePromotion(client, { tenantId, plan: plan as Plan, period: billingPeriod as BillingPeriod, code: normalizedCode });
    const { data: checkout, error } = await client.from("subscription_checkout_requests").insert({
      tenant_id: tenantId,
      plan,
      billing_period: billingPeriod,
      base_amount: quote.finalAmount + quote.discountAmount,
      discount_amount: quote.discountAmount,
      bonus_days: quote.bonusDays,
      final_amount: quote.finalAmount,
      promotion_id: quote.promotionId,
      promotion_code: quote.promotionCode,
      status: "awaiting_payment_provider",
    }).select("id, final_amount, bonus_days").single();
    if (error || !checkout) return NextResponse.json({ error: "Не удалось сохранить выбор тарифа. Попробуйте ещё раз." }, { status: 500 });

    return NextResponse.json({
      requestId: checkout.id,
      finalAmount: checkout.final_amount,
      bonusDays: checkout.bonus_days,
      message: quote.message ?? "Тариф выбран. Мы подключим оплату после настройки официального провайдера.",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось подготовить подключение тарифа" }, { status: 400 });
  }
}
