import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { getPolarClient, getPolarAiCreditsProductId } from "@/lib/polar";
import { createClient } from "@/lib/supabase/server";
import { productAiAccess } from "@/lib/ai/product-ai-entitlement";

export async function POST(request: Request) {
  const context = await getSessionContext();
  if (!context?.user || !["owner", "superadmin"].includes(context.role)) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  if (!context.tenantId) return NextResponse.json({ error: "Магазин не привязан" }, { status: 400 });
  const client = await createClient();
  const { data: tenant, error: tenantError } = await client.from("tenants").select("plan,next_plan,status,trial_ends_at").eq("id", context.tenantId).maybeSingle();
  if (tenantError || !tenant) return NextResponse.json({ error: "Не удалось проверить тариф магазина" }, { status: 503 });
  const entitlement = productAiAccess({ plan: tenant.plan, nextPlan: tenant.next_plan, status: tenant.status, trialEndsAt: tenant.trial_ends_at, premiumTrialJobStarted: true }, "topup");
  if (!entitlement.allowed) return NextResponse.json({ error: "Покупка AI-кредитов доступна только оплаченному Premium" }, { status: 403 });
  if (process.env.AI_CREDIT_TOPUPS_ENABLED !== "true") return NextResponse.json({ error: "Пополнение AI-кредитов ещё не запущено" }, { status: 503 });
  const productId = getPolarAiCreditsProductId();
  if (!productId) return NextResponse.json({ error: "Товар AI-кредитов ещё не подключён" }, { status: 503 });
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  try {
    const checkout = await getPolarClient().checkouts.create({ products: [productId], externalCustomerId: context.tenantId, customerEmail: context.user.email ?? undefined, metadata: { tenantId: context.tenantId, purchaseType: "ai_credits", credits: "100" }, successUrl: `${siteUrl}/admin/ai-studio?credits=success` });
    return NextResponse.json({ url: checkout.url });
  } catch { return NextResponse.json({ error: "Не удалось открыть оплату AI-кредитов" }, { status: 502 }); }
}
