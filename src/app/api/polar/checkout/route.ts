import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { isPublicPlan, type Plan } from "@/lib/plans";
import { getPolarClient, getPolarProductId, isPolarConfigured, type BillingPeriod } from "@/lib/polar";

type Body = { plan?: unknown; billingPeriod?: unknown };

export async function POST(request: Request) {
  try {
    const { plan, billingPeriod } = (await request.json()) as Body;
    if (!isPublicPlan(plan)) return NextResponse.json({ error: "Неизвестный тариф" }, { status: 400 });
    if (billingPeriod !== "monthly" && billingPeriod !== "annual") return NextResponse.json({ error: "Выберите период оплаты" }, { status: 400 });

    const { user, tenantId } = await requireRole(["owner", "superadmin"]);
    if (!tenantId) return NextResponse.json({ error: "Магазин не привязан к аккаунту" }, { status: 400 });

    if (!isPolarConfigured(plan as Plan, billingPeriod as BillingPeriod)) {
      return NextResponse.json({ error: "Оплата подпиской пока недоступна. Мы включим её сразу после подключения провайдера." }, { status: 503 });
    }

    const productId = getPolarProductId(plan as Plan, billingPeriod as BillingPeriod)!;
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin).replace(/\/$/, "");
    const polar = getPolarClient();
    const checkout = await polar.checkouts.create({
      products: [productId],
      externalCustomerId: tenantId,
      customerEmail: user?.email ?? undefined,
      metadata: { tenantId, plan, billingPeriod },
      successUrl: `${siteUrl}/admin/plan?checkout=success`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось начать оплату" }, { status: 400 });
  }
}
