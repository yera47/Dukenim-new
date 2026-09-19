import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import {loyaltyClient} from "@/lib/loyalty-db";
import type {FoodSelection} from "@/lib/food-options";

export type CheckoutItem = { variantId: string; qty: number;selection?:FoodSelection };
export type CheckoutInput = {
  tenantId: string;
  name: string;
  phone: string;
  deliveryMethod: "pickup" | "courier";
  deliveryAddress: string;
  zoneId: string | null;
  paymentMethod: "cash";
  requestedFor: string | null;
  items: CheckoutItem[];
  buyer?:{userId:string|null;hash:string};
  reward?:{ruleId:string;milestone:number}|null;
  referralCode?:string|null;
};

export async function createStorefrontOrder(client: SupabaseClient<Database>, input: CheckoutInput) {
  const args = {
    p_tenant_id: input.tenantId,
    p_name: input.name,
    p_phone: input.phone,
    p_delivery_method: input.deliveryMethod,
    p_delivery_address: input.deliveryAddress,
    p_zone_id: input.zoneId,
    p_payment_method: input.paymentMethod,
    p_items: input.items.map((item) => ({ variant_id: item.variantId, qty: item.qty,...(item.selection?{selection:item.selection}:{}) })) as Json,
    p_requested_for: input.requestedFor,
  } as Database["public"]["Functions"]["create_storefront_order_v2"]["Args"] & { p_requested_for: string | null };
  if(input.buyer)return loyaltyClient(client).rpc("create_buyer_order",{...args,p_requested_for:input.requestedFor,p_user:input.buyer.userId,p_guest_hash:input.buyer.hash,p_reward_rule:input.reward?.ruleId??null,p_reward_milestone:input.reward?.milestone??null,p_referral_code:input.referralCode??null});
  return client.rpc("create_storefront_order_v2", args);
}

export async function getCheckoutOptions(client: SupabaseClient<Database>, tenantId: string) {
  const [settings, zones] = await Promise.all([
    client.from("tenant_settings").select("delivery_enabled,pickup_enabled,pickup_location,payment_online,min_order").eq("tenant_id", tenantId).maybeSingle(),
    client.from("delivery_zones").select("id,name,cost,free_from,eta_text").eq("tenant_id", tenantId).eq("is_active", true).order("cost"),
  ]);
  return { settings: settings.data, zones: zones.data ?? [], error: settings.error ?? zones.error };
}

export async function markOrderPaid(client: SupabaseClient<Database>, orderId: string) {
  return client.from("orders").update({ payment_status: "paid" }).eq("id", orderId);
}
