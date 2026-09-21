import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {guestOrdersCookie,readGuestOrders,signGuestOrders} from "@/lib/guest-orders";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStorefrontOrder, getCheckoutOptions, type CheckoutItem } from "@/lib/queries/orders";
import { getPublicTenantBySlug } from "@/lib/queries/tenants";
import {buyerIdentity,setBuyerCookie} from "@/lib/buyer-identity";
import {z} from "zod";
import {foodSelectionSchema,foodSelectionKey,emptyFoodSelection} from "@/lib/food-options";
import {buyerClient} from "@/lib/buyer-db";

type Body = {
  slug?: unknown;
  name?: unknown;
  phone?: unknown;
  deliveryMethod?: unknown;
  deliveryAddress?: unknown;
  zoneId?: unknown;
  paymentMethod?: unknown;
  timingMode?: unknown;
  requestedFor?: unknown;
  items?: unknown;
  reward?:unknown;
  referralCode?:unknown;
  marketingConsent?:unknown;
  yandexConsent?:unknown;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseItems(value: unknown): CheckoutItem[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) return null;
  const seen = new Set<string>();
  const items: CheckoutItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const variantId = "variantId" in item ? String(item.variantId) : "";
    const qty = "qty" in item ? Number(item.qty) : Number.NaN;
    const selection=foodSelectionSchema.safeParse("selection" in item?item.selection:emptyFoodSelection);
    if(!selection.success)return null;const key=foodSelectionKey(variantId,selection.data);
    if (!uuidPattern.test(variantId) || !Number.isInteger(qty) || qty < 1 || qty > 20 || seen.has(key)) return null;
    if(items.filter(i=>i.variantId===variantId).reduce((sum,i)=>sum+i.qty,0)+qty>20)return null;
    seen.add(key);
    items.push({ variantId, qty, selection:selection.data });
  }
  return items;
}

function safeOrderError(message?: string) {
  if (!message) return "Не удалось создать заказ";
  if(message.includes("Reward")||message.includes("Sign in"))return "Награда пока недоступна. Обновите карту и проверьте условия.";
  if(/Option|Ingredient|Combo|selection/i.test(message))return "Состав блюда изменился. Откройте его в меню и выберите варианты заново.";
  if (message.includes("Minimum order")) return "Сумма заказа меньше минимальной для этого магазина.";
  if (message.includes("Delivery zone")) return "Выберите доступную зону доставки.";
  if (message.includes("Delivery unavailable")) return "Доставка временно недоступна.";
  if (message.includes("Pickup unavailable")) return "Самовывоз временно недоступен.";
  if (message.includes("Requested time")) return "Выберите время не раньше чем через 15 минут и не позже чем через 14 дней.";
  if (message.includes("Variant unavailable") || message.includes("Insufficient stock")) return "Один из товаров закончился или изменился. Обновите корзину.";
  return "Не удалось создать заказ. Проверьте данные и попробуйте ещё раз.";
}

export async function POST(request: Request) {
  if(request.headers.get("origin")&&request.headers.get("origin")!==new URL(request.url).origin)return NextResponse.json({error:"Недопустимый источник запроса"},{status:403});
  // Demonstration checkout is explicitly simulated by the demo client, never by
  // the real order endpoint. Missing configuration must not report a saved order.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Оформление заказа временно недоступно. Попробуйте позже." }, { status: 503 });
  }
  try {
    const raw = await request.text();
    if (raw.length > 64_000) return NextResponse.json({ error: "Заказ слишком большой" }, { status: 413 });
    const body = JSON.parse(raw) as Body;
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    let phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const deliveryAddress = typeof body.deliveryAddress === "string" ? body.deliveryAddress.trim() : "";
    const deliveryMethod = body.deliveryMethod === "delivery" ? "courier" : body.deliveryMethod;
    const zoneId = typeof body.zoneId === "string" && uuidPattern.test(body.zoneId) ? body.zoneId : null;
    const timingMode = body.timingMode === "scheduled" ? "scheduled" : body.timingMode === "asap" || body.timingMode === undefined ? "asap" : null;
    const requestedFor = timingMode === "scheduled" && typeof body.requestedFor === "string" ? new Date(body.requestedFor) : null;
    const items = parseItems(body.items);
    const extra=z.object({reward:z.object({ruleId:z.string().uuid(),milestone:z.number().int().positive()}).nullable().optional(),referralCode:z.string().uuid().nullable().optional()}).safeParse({reward:body.reward,referralCode:body.referralCode});
    if(!extra.success)return NextResponse.json({error:"Проверьте выбранную награду"},{status:400});

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || name.length < 2 || name.length > 80 || phone.length > 30 || phone.replace(/\D/g, "").length < 7 || !items) {
      return NextResponse.json({ error: "Проверьте контакты и товары в заказе" }, { status: 400 });
    }
    if (deliveryMethod !== "pickup" && deliveryMethod !== "courier") return NextResponse.json({ error: "Выберите способ получения" }, { status: 400 });
    if (!timingMode || (timingMode === "scheduled" && (!requestedFor || !Number.isFinite(requestedFor.getTime()) || requestedFor.getTime() < Date.now() + 15 * 60_000 || requestedFor.getTime() > Date.now() + 14 * 86_400_000))) {
      return NextResponse.json({ error: "Выберите время не раньше чем через 15 минут и не позже чем через 14 дней." }, { status: 400 });
    }
    if (deliveryMethod === "courier" && (deliveryAddress.length < 4 || deliveryAddress.length > 500)) return NextResponse.json({ error: "Укажите полный адрес доставки" }, { status: 400 });
    if ((body.paymentMethod ?? "cash") !== "cash") return NextResponse.json({ error: "Сейчас доступна только оплата при получении" }, { status: 400 });

    const client = createAdminClient();
    const { data: tenant } = await getPublicTenantBySlug(client, slug);
    if (!tenant) return NextResponse.json({ error: "Магазин недоступен" }, { status: 404 });
    const options = await getCheckoutOptions(client, tenant.id);
    if (options.error || !options.settings) return NextResponse.json({ error: "Не удалось загрузить способы получения" }, { status: 503 });
    if (deliveryMethod === "pickup" && !options.settings.pickup_enabled) return NextResponse.json({ error: "Самовывоз временно недоступен" }, { status: 400 });
    if (deliveryMethod === "courier") {
      if (!options.settings?.delivery_enabled) return NextResponse.json({ error: "Доставка временно недоступна" }, { status: 400 });
      if (!zoneId || !options.zones.some((zone) => zone.id === zoneId)) return NextResponse.json({ error: "Выберите доступную зону доставки" }, { status: 400 });
      if (options.zones.find((zone) => zone.id === zoneId)?.provider === "yandex" && body.yandexConsent !== true) return NextResponse.json({ error: "Прочитайте условия Яндекс Доставки и подтвердите согласие." }, { status: 400 });
    }

    const secret=process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const buyer=await buyerIdentity();
    if(!buyer.userId)return NextResponse.json({error:"Подтвердите номер телефона перед заказом."},{status:401});
    const account=await client.auth.admin.getUserById(buyer.userId);
    const verifiedPhone=account.data.user?.phone_confirmed_at?account.data.user.phone:null;
    if(!verifiedPhone)return NextResponse.json({error:"Подтвердите номер телефона перед заказом."},{status:401});
    phone=`+${verifiedPhone.replace(/\D/g,"")}`;
    const previous=readGuestOrders((await cookies()).get(guestOrdersCookie)?.value,secret);
    const { data, error } = await createStorefrontOrder(client, {
      tenantId: tenant.id,
      name,
      phone,
      deliveryMethod,
      deliveryAddress,
      zoneId: deliveryMethod === "courier" ? zoneId : null,
      paymentMethod: "cash",
      requestedFor: requestedFor?.toISOString() ?? null,
      items,
      buyer,reward:extra.data.reward,referralCode:extra.data.referralCode,
    });
    if (error || !data?.[0]) return NextResponse.json({ error: safeOrderError(error?.message) }, { status: 400 });
    const order = data[0];
    if(body.marketingConsent===true){
      await buyerClient(client).from("customers").update({marketing_sms_consent:true,marketing_sms_consent_at:new Date().toISOString()}).eq("tenant_id",tenant.id).eq("user_id",buyer.userId);
    }
    const response=NextResponse.json({ orderId: order.order_id, orderNumber: order.order_number, total: order.total });
    setBuyerCookie(response,buyer.token);
    response.cookies.set(guestOrdersCookie,signGuestOrders([...previous,{id:order.order_id,tenant:tenant.id,expires:Date.now()+30*86400000}],secret),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:30*86400});
    response.headers.set("Cache-Control","private, no-store");
    return response;
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать данные заказа" }, { status: 400 });
  }
}
