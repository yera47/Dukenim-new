import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

export type CheckoutItem = { variantId: string; qty: number };
export type CheckoutInput = {
  tenantId: string;
  name: string;
  phone: string;
  deliveryMethod: "pickup" | "courier";
  deliveryAddress: string;
  zoneId: string | null;
  paymentMethod: "cash";
  items: CheckoutItem[];
};

export async function createStorefrontOrder(client: SupabaseClient<Database>, input: CheckoutInput) {
  return client.rpc("create_storefront_order_v2", {
    p_tenant_id: input.tenantId,
    p_name: input.name,
    p_phone: input.phone,
    p_delivery_method: input.deliveryMethod,
    p_delivery_address: input.deliveryAddress,
    p_zone_id: input.zoneId,
    p_payment_method: input.paymentMethod,
    p_items: input.items.map((item) => ({ variant_id: item.variantId, qty: item.qty })) as Json,
  });
}

export async function getCheckoutOptions(client: SupabaseClient<Database>, tenantId: string) {
  const [settings, zones] = await Promise.all([
    client.from("tenant_settings").select("delivery_enabled,pickup_enabled,payment_online,min_order").eq("tenant_id", tenantId).maybeSingle(),
    client.from("delivery_zones").select("id,name,cost,free_from,eta_text").eq("tenant_id", tenantId).eq("is_active", true).order("cost"),
  ]);
  return { settings: settings.data, zones: zones.data ?? [], error: settings.error ?? zones.error };
}

export async function markOrderPaid(client: SupabaseClient<Database>, orderId: string) {
  return client.from("orders").update({ payment_status: "paid" }).eq("id", orderId);
}
