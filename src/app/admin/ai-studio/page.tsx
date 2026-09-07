import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { tenantEntitlement } from "@/lib/plan-access";
import { hasPlan } from "@/lib/plans";
import { aiStudioStructureSchema, getAiStudioStatus } from "@/lib/ai/studio";
import { AiStudioClient } from "./ai-studio-client";
import { createClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/queries/owner";

export default async function AiStudioPage() {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  const entitlement = tenantId ? await tenantEntitlement(tenantId) : { active: false, plan: "basic" as const };
  const brand = entitlement.active && hasPlan(entitlement.plan, "standard");
  const status = getAiStudioStatus();
  const tenant = tenantId && process.env.NEXT_PUBLIC_SUPABASE_URL ? (await getTenant(await createClient(), tenantId)).data : null;
  const catalogStatus = tenant?.catalog_status ?? "not_started";
  const wallet = tenant as ({ai_credit_balance?:number;ai_credits_reset_at?:string}) | null;
  const lowUsage = typeof wallet?.ai_credit_balance === "number" && wallet.ai_credit_balance <= 12 && Boolean(wallet.ai_credits_reset_at && new Date(wallet.ai_credits_reset_at).getTime() > Date.now());
  const client = tenant ? await createClient() : null;
  const latest = client ? (await client.from("ai_studio_generations").select("id,output").eq("tenant_id", tenantId!).eq("intent", "catalog_structure").order("created_at", { ascending: false }).limit(1).maybeSingle()).data : null;
  const parsed = aiStudioStructureSchema.safeParse(latest?.output);
  const initialStructure = latest && parsed.success ? { generationId: latest.id, structure: parsed.data } : undefined;
  const categories = client ? (await client.from("categories").select("id,name").eq("tenant_id", tenantId!).eq("is_active", true).order("sort_order")).data ?? [] : [];
  return <section className="ai-studio-page">
    {lowUsage&&<p role="status" className="mb-4 rounded-xl border bg-white p-3 text-sm">Доступный объём AI заканчивается. <Link className="underline" href="/admin/settings/usage">Посмотреть использование</Link></p>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="muted text-sm">Ваш помощник в магазине</p><h1 className="mt-1 text-2xl font-bold">AI Studio</h1></div>
      <Link href="/admin/requests?source=ai-studio" className="btn btn-secondary"><MessageSquare size={16}/> Написать человеку</Link>
    </div>
    <AiStudioClient enabled={entitlement.active && status.configured} imageEnabled={brand && status.imageConfigured} brand={brand} catalogStatus={catalogStatus} storeName={tenant?.catalog_name ?? tenant?.name ?? "Мой магазин"} slug={tenant?.slug ?? "my-store"} plan={entitlement.plan} vertical={tenant?.business_vertical ?? "other"} initialStructure={initialStructure} categories={categories} />
  </section>;
}
