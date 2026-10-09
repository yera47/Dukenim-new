import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { isPublicPlan, type Plan } from "@/lib/plans";
import { getPolarClient, getPolarProductId, isPolarConfigured } from "@/lib/polar";

type Body = { plan?: unknown; billingPeriod?: unknown };

export async function POST(request: Request) {
  try {
    const { plan, billingPeriod } = (await request.json()) as Body;
    if (!isPublicPlan(plan)) return NextResponse.json({ error: "Неизвестный тариф" }, { status: 400 });
    if (billingPeriod !== "monthly") return NextResponse.json({ error: "Доступна только ежемесячная оплата." }, { status: 400 });

    const context = await getSessionContext();
    if (!context?.user) return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
    if (!["owner", "superadmin"].includes(context.role)) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    const { user, tenantId } = context;
    if (!tenantId) return NextResponse.json({ error: "Магазин не привязан к аккаунту" }, { status: 400 });

    const publicPlan: Plan = "basic";
    if (!isPolarConfigured(publicPlan, "monthly")) {
      return NextResponse.json({ error: "Оплата подпиской пока недоступна. Мы включим её сразу после подключения провайдера." }, { status: 503 });
    }

    const productId = getPolarProductId(publicPlan, "monthly")!;
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin).replace(/\/$/, "");
    const polar = getPolarClient();
    const checkout = await polar.checkouts.create({
      products: [productId],
      externalCustomerId: tenantId,
      customerEmail: user?.email ?? undefined,
      metadata: { tenantId, plan: publicPlan, billingPeriod: "monthly" },
      successUrl: `${siteUrl}/admin/plan?checkout=success`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch {
    return NextResponse.json({ error: "Не удалось начать оплату. Попробуйте ещё раз или напишите в поддержку." }, { status: 502 });
  }
}
