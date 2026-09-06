import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStorefrontOrder, getCheckoutOptions, type CheckoutItem } from "@/lib/queries/orders";
import { getPublicTenantBySlug } from "@/lib/queries/tenants";

type Body = {
  slug?: unknown;
  name?: unknown;
  phone?: unknown;
  deliveryMethod?: unknown;
  deliveryAddress?: unknown;
  zoneId?: unknown;
  paymentMethod?: unknown;
  items?: unknown;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseItems(value: unknown, allowDemoIds = false): CheckoutItem[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) return null;
  const seen = new Set<string>();
  const items: CheckoutItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const variantId = "variantId" in item ? String(item.variantId) : "";
    const qty = "qty" in item ? Number(item.qty) : Number.NaN;
    if ((!allowDemoIds && !uuidPattern.test(variantId)) || (allowDemoIds && !/^(?:v\d+|[0-9a-f-]{36})$/i.test(variantId)) || !Number.isInteger(qty) || qty < 1 || qty > 20 || seen.has(variantId)) return null;
    seen.add(variantId);
    items.push({ variantId, qty });
  }
  return items;
}

function safeOrderError(message?: string) {
  if (!message) return "Не удалось создать заказ";
  if (message.includes("Minimum order")) return "Сумма заказа меньше минимальной для этого магазина.";
  if (message.includes("Delivery zone")) return "Выберите доступную зону доставки.";
  if (message.includes("Delivery unavailable")) return "Доставка временно недоступна.";
  if (message.includes("Pickup unavailable")) return "Самовывоз временно недоступен.";
  if (message.includes("Variant unavailable") || message.includes("Insufficient stock")) return "Один из товаров закончился или изменился. Обновите корзину.";
  return "Не удалось создать заказ. Проверьте данные и попробуйте ещё раз.";
}

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 64_000) return NextResponse.json({ error: "Заказ слишком большой" }, { status: 413 });
    const body = JSON.parse(raw) as Body;
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const deliveryAddress = typeof body.deliveryAddress === "string" ? body.deliveryAddress.trim() : "";
    const deliveryMethod = body.deliveryMethod === "delivery" ? "courier" : body.deliveryMethod;
    const zoneId = typeof body.zoneId === "string" && uuidPattern.test(body.zoneId) ? body.zoneId : null;
    const items = parseItems(body.items, !process.env.NEXT_PUBLIC_SUPABASE_URL);

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || name.length < 2 || name.length > 80 || phone.length > 30 || phone.replace(/\D/g, "").length < 7 || !items) {
      return NextResponse.json({ error: "Проверьте контакты и товары в заказе" }, { status: 400 });
    }
    if (deliveryMethod !== "pickup" && deliveryMethod !== "courier") return NextResponse.json({ error: "Выберите способ получения" }, { status: 400 });
    if (deliveryMethod === "courier" && (deliveryAddress.length < 4 || deliveryAddress.length > 500)) return NextResponse.json({ error: "Укажите полный адрес доставки" }, { status: 400 });
    if ((body.paymentMethod ?? "cash") !== "cash") return NextResponse.json({ error: "Сейчас доступна только оплата при получении" }, { status: 400 });
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.json({ orderId: "demo", orderNumber: 1043, total: items.reduce((sum, item) => sum + item.qty * 42900, 0) });
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Оформление заказа временно недоступно. Попробуйте позже." }, { status: 503 });

    const client = createAdminClient();
    const { data: tenant } = await getPublicTenantBySlug(client, slug);
    if (!tenant) return NextResponse.json({ error: "Магазин недоступен" }, { status: 404 });
    const options = await getCheckoutOptions(client, tenant.id);
    if (options.error) return NextResponse.json({ error: "Не удалось загрузить способы получения" }, { status: 503 });
    if (deliveryMethod === "pickup" && options.settings?.pickup_enabled === false) return NextResponse.json({ error: "Самовывоз временно недоступен" }, { status: 400 });
    if (deliveryMethod === "courier") {
      if (!options.settings?.delivery_enabled) return NextResponse.json({ error: "Доставка временно недоступна" }, { status: 400 });
      if (!zoneId || !options.zones.some((zone) => zone.id === zoneId)) return NextResponse.json({ error: "Выберите доступную зону доставки" }, { status: 400 });
    }

    const { data, error } = await createStorefrontOrder(client, {
      tenantId: tenant.id,
      name,
      phone,
      deliveryMethod,
      deliveryAddress,
      zoneId: deliveryMethod === "courier" ? zoneId : null,
      paymentMethod: "cash",
      items,
    });
    if (error || !data?.[0]) return NextResponse.json({ error: safeOrderError(error?.message) }, { status: 400 });
    const order = data[0];
    return NextResponse.json({ orderId: order.order_id, orderNumber: order.order_number, total: order.total });
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать данные заказа" }, { status: 400 });
  }
}
