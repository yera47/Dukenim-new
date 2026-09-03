import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStorefrontOrder, getDeliveryZone, type CheckoutItem } from "@/lib/queries/orders";
import { getPublicTenantBySlug } from "@/lib/queries/tenants";

type Body = { slug?: string; name?: string; phone?: string; deliveryMethod?: string; deliveryAddress?: string; zoneId?: string | null; paymentMethod?: string; items?: CheckoutItem[] };

export async function POST(request: Request) {
  try {
    const body = await request.json() as Body;
    const deliveryMethod = body.deliveryMethod === "delivery" ? "courier" : body.deliveryMethod;
    const paymentMethod = body.paymentMethod ?? "cash";
    if (!body.slug || !body.name || !body.phone || !body.items?.length || !["pickup", "courier"].includes(deliveryMethod ?? "")) return NextResponse.json({ error: "Заполните данные заказа" }, { status: 400 });
    if (deliveryMethod === "courier" && !body.deliveryAddress?.trim()) return NextResponse.json({ error: "Укажите адрес доставки" }, { status: 400 });
    if (!["cash", "kaspi", "card", "online"].includes(paymentMethod)) return NextResponse.json({ error: "Выберите доступный способ оплаты" }, { status: 400 });
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.json({ orderId: "demo", orderNumber: 1043, total: body.items.length * 42900 });
    if (paymentMethod === "online") return NextResponse.json({ error: "Онлайн-оплата появится после подключения платёжного провайдера. Выберите оплату при получении." }, { status: 400 });
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Оформление заказа временно недоступно. Попробуйте позже." }, { status: 503 });
    const client = createAdminClient();
    const { data: tenant } = await getPublicTenantBySlug(client, body.slug);
    if (!tenant) return NextResponse.json({ error: "Магазин недоступен" }, { status: 404 });
    const { data: zone } = await getDeliveryZone(client, tenant.id, body.zoneId ?? null);
    const deliveryCost = deliveryMethod === "pickup" ? 0 : zone?.cost ?? 1500;
    const { data, error } = await createStorefrontOrder(client, { tenantId: tenant.id, name: body.name.trim(), phone: body.phone.trim(), deliveryMethod: deliveryMethod!, deliveryAddress: body.deliveryAddress ?? "", deliveryCost, paymentMethod, items: body.items });
    if (error || !data?.[0]) return NextResponse.json({ error: error?.message ?? "Не удалось создать заказ" }, { status: 400 });
    const order = data[0];
    return NextResponse.json({ orderId: order.order_id, orderNumber: order.order_number, total: order.total });
  } catch {
    return NextResponse.json({ error: "Внутренняя ошибка оформления" }, { status: 500 });
  }
}
