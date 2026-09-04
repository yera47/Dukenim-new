import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { getPolarClient } from "@/lib/polar";

function isTopUpConfigured() {
  return Boolean(process.env.POLAR_ACCESS_TOKEN?.trim() && process.env.POLAR_AI_CREDIT_TOPUP_PRODUCT_ID?.trim());
}

export async function POST(request: Request) {
  try {
    const context = await getSessionContext();
    if (!context?.user) return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
    if (!["owner", "superadmin"].includes(context.role)) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    const { user, tenantId } = context;
    if (!tenantId) return NextResponse.json({ error: "Магазин не привязан к аккаунту" }, { status: 400 });

    if (!isTopUpConfigured()) {
      return NextResponse.json({ error: "Пополнение токенов пока недоступно." }, { status: 503 });
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin).replace(/\/$/, "");
    const polar = getPolarClient();
    const checkout = await polar.checkouts.create({
      products: [process.env.POLAR_AI_CREDIT_TOPUP_PRODUCT_ID!.trim()],
      externalCustomerId: tenantId,
      customerEmail: user?.email ?? undefined,
      metadata: { tenantId, kind: "ai_credit_topup" },
      successUrl: `${siteUrl}/admin/plan?topup=success`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось начать оплату" }, { status: 400 });
  }
}
