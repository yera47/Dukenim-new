import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { tenantEntitlement } from "@/lib/plan-access";
import { hasPlan } from "@/lib/plans";
import { aiStudioStructureSchema, getAiStudioStatus } from "@/lib/ai/studio";
import { AiStudioClient } from "./ai-studio-client";
import { createClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/queries/owner";
import { aiStudioDesignSchema } from "@/lib/ai/studio-schemas";
import styles from "./studio.module.css";

export default async function AiStudioPage() {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  const client = tenantId && process.env.NEXT_PUBLIC_SUPABASE_URL ? await createClient() : null;
  const [entitlement, tenant] = await Promise.all([
    tenantId ? tenantEntitlement(tenantId) : Promise.resolve({ active: false, plan: "basic" as const }),
    client && tenantId ? getTenant(client, tenantId).then(result => result.data) : Promise.resolve(null),
  ]);
  const brand = entitlement.active && hasPlan(entitlement.plan, "standard");
  const status = getAiStudioStatus();
  const catalogStatus = tenant?.catalog_status ?? "not_started";
  const wallet = tenant as ({ai_credit_balance?:number;ai_credits_reset_at?:string}) | null;
  const lowUsage = typeof wallet?.ai_credit_balance === "number" && wallet.ai_credit_balance <= 12 && Boolean(wallet.ai_credits_reset_at && new Date(wallet.ai_credits_reset_at).getTime() > Date.now());
  const [latestResult, savedDesign, categoriesResult, deliveryResult] = client && tenant ? await Promise.all([
    client.from("ai_studio_generations").select("id,output").eq("tenant_id", tenantId!).eq("intent", "catalog_structure").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    client.from("ai_studio_generations").select("id,output").eq("tenant_id", tenantId!).eq("intent", "store_design").order("created_at", {ascending:false}).order("id", {ascending:false}).limit(1).maybeSingle(),
    client.from("categories").select("id,name").eq("tenant_id", tenantId!).eq("is_active", true).order("sort_order"),
    client.from("tenant_settings").select("delivery_enabled,pickup_enabled").eq("tenant_id",tenantId!).maybeSingle(),
  ]) : [null, null, null, null];
  const latest = latestResult?.data ?? null;
  const parsed = aiStudioStructureSchema.safeParse(latest?.output);
  const initialStructure = latest && parsed.success ? { generationId: latest.id, structure: parsed.data } : undefined;
  // Restore the saved proposal, not only the conversation. Never auto-apply it.
  const parsedDesign = aiStudioDesignSchema.safeParse(savedDesign?.data?.output);
  const initialDesign = savedDesign?.data && parsedDesign.success ? {generationId:savedDesign.data.id,design:parsedDesign.data} : undefined;
  const categories = categoriesResult?.data ?? [];
  return <section data-catalog-status={catalogStatus} className={`ai-studio-page ${styles.page}`}>
    {savedDesign?.error&&<p role="alert">Не удалось восстановить последнее оформление. Оно не удалено — обновите страницу.</p>}
    {lowUsage&&<p role="status" className="mb-4 rounded-xl border bg-white p-3 text-sm">Доступный объём AI заканчивается. <Link className="underline" href="/admin/settings/usage">Посмотреть использование</Link></p>}
    <AiStudioClient enabled={entitlement.active && status.configured} imageEnabled={brand && status.imageConfigured} brand={brand} catalogStatus={catalogStatus} catalogPublished={tenant?.catalog_published??true} deliveryConfigured={Boolean(deliveryResult?.data?.delivery_enabled||deliveryResult?.data?.pickup_enabled)} storeName={tenant?.catalog_name ?? tenant?.name ?? "Мой магазин"} slug={tenant?.slug ?? "my-store"} plan={entitlement.plan} vertical={tenant?.business_vertical ?? "other"} initialDesign={initialDesign} initialStructure={initialStructure} categories={categories} />
  </section>;
}
