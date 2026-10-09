import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { planAnnualPrice, planPrice, type Plan } from "@/lib/plans";

export type BillingPeriod = "monthly" | "annual";
export type PromotionQuote = {
  promotionId: string | null;
  promotionCode: string | null;
  discountAmount: number;
  bonusDays: number;
  finalAmount: number;
  message: string | null;
};

const codePattern = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;
export function normalizePromotionCode(value: unknown) {
  const code = String(value ?? "").trim().toUpperCase();
  return codePattern.test(code) ? code : null;
}

export function subscriptionBaseAmount(plan: Plan, period: BillingPeriod) {
  return period === "annual" ? planAnnualPrice[plan] : planPrice[plan];
}

export async function quotePromotion(client: SupabaseClient<Database>, input: { tenantId: string; plan: Plan; period: BillingPeriod; code: string | null }): Promise<PromotionQuote> {
  const baseAmount = subscriptionBaseAmount(input.plan, input.period);
  if (!input.code) return { promotionId: null, promotionCode: null, discountAmount: 0, bonusDays: 0, finalAmount: baseAmount, message: null };

  const { data: promotion } = await client.from("subscription_promotions").select("*").eq("code", input.code).maybeSingle();
  if (!promotion || !promotion.is_active || new Date(promotion.starts_at).getTime() > Date.now() || (promotion.ends_at && new Date(promotion.ends_at).getTime() <= Date.now())) {
    throw new Error("Промокод не найден или срок его действия завершён.");
  }
  if (promotion.plan && promotion.plan !== input.plan) throw new Error("Этот промокод действует для другого тарифа.");

  const [{ count: totalRedemptions }, { count: tenantRedemptions }, { count: activeSubscriptions }] = await Promise.all([
    client.from("subscription_promo_redemptions").select("id", { count: "exact", head: true }).eq("promotion_id", promotion.id),
    client.from("subscription_promo_redemptions").select("id", { count: "exact", head: true }).eq("promotion_id", promotion.id).eq("tenant_id", input.tenantId),
    client.from("subscriptions").select("id", { count: "exact", head: true }).eq("tenant_id", input.tenantId).eq("status", "active"),
  ]);
  if (promotion.max_redemptions !== null && (totalRedemptions ?? 0) >= promotion.max_redemptions) throw new Error("Лимит активаций этого промокода уже исчерпан.");
  if ((tenantRedemptions ?? 0) >= promotion.per_tenant_limit) throw new Error("Этот промокод уже использован для данного магазина.");
  if (promotion.new_tenants_only && (activeSubscriptions ?? 0) > 0) throw new Error("Этот промокод действует только при первом подключении тарифа.");

  const discountAmount = promotion.discount_type === "percent"
    ? Math.round(baseAmount * promotion.discount_value / 100)
    : promotion.discount_type === "fixed_kzt" ? Math.min(baseAmount, promotion.discount_value) : 0;
  const bonusDays = promotion.discount_type === "free_days" ? promotion.discount_value : 0;
  return {
    promotionId: promotion.id,
    promotionCode: promotion.code,
    discountAmount,
    bonusDays,
    finalAmount: baseAmount - discountAmount,
    message: bonusDays ? `Промокод добавит ${bonusDays} дн. к первому оплаченному периоду.` : `Промокод применён: скидка ${discountAmount.toLocaleString("ru-KZ")} ₸.`,
  };
}
