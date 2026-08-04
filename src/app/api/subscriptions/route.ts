import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { planPrice, type Plan } from "@/lib/plans";
import { isPaymentConfigured, processPayment } from "@/lib/payment";
export async function POST(request: Request) {
  try {
    const { plan } = await request.json() as { plan?: Plan };
    if (!plan || !(plan in planPrice)) return NextResponse.json({ error: "Неизвестный тариф" }, { status: 400 });
    const { tenantId } = await requireRole(["owner", "superadmin"]);
    if (!tenantId) return NextResponse.json({ error: "Магазин не привязан" }, { status: 400 });
    if (!isPaymentConfigured()) return NextResponse.json({ error: "Онлайн-оплата будет доступна после подключения договора эквайринга. Бесплатный период продолжает действовать." }, { status: 503 });
    const payment = await processPayment({ amount: planPrice[plan], currency: "KZT", description: `Тариф ${plan}`, reference: `subscription_${tenantId}_${Date.now()}` });
    if (!payment.success) return NextResponse.json({ error: payment.message ?? "Оплата не прошла" }, { status: 402 });
    return NextResponse.json({ success: true, plan, paymentId: payment.paymentId });
  } catch { return NextResponse.json({ error: "Не удалось открыть оплату" }, { status: 500 }); }
}
