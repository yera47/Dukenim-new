import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { getPolarClient, getPolarAiCreditsProductId } from "@/lib/polar";

export async function POST(request: Request) {
  const context = await getSessionContext();
  if (!context?.user || !["owner", "superadmin"].includes(context.role)) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  if (!context.tenantId) return NextResponse.json({ error: "Магазин не привязан" }, { status: 400 });
  const productId = getPolarAiCreditsProductId();
  if (!productId) return NextResponse.json({ error: "Товар AI-кредитов ещё не подключён" }, { status: 503 });
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  try {
    const checkout = await getPolarClient().checkouts.create({ products: [productId], externalCustomerId: context.tenantId, customerEmail: context.user.email ?? undefined, metadata: { tenantId: context.tenantId, purchaseType: "ai_credits", credits: "100" }, successUrl: `${siteUrl}/admin/ai-studio?credits=success` });
    return NextResponse.json({ url: checkout.url });
  } catch { return NextResponse.json({ error: "Не удалось открыть оплату AI-кредитов" }, { status: 502 }); }
}
