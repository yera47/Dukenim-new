import Link from "next/link";
import { ArrowRight, MessageSquare, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { tenantHasPlan } from "@/lib/plan-access";
import { getAiStudioStatus } from "@/lib/ai/studio";
import { AiStudioClient } from "./ai-studio-client";
import { createClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/queries/owner";

export default async function AiStudioPage() {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  const brand = tenantId ? await tenantHasPlan(tenantId, "standard") : false;
  const status = getAiStudioStatus();
  const tenant = tenantId && process.env.NEXT_PUBLIC_SUPABASE_URL ? (await getTenant(await createClient(), tenantId)).data : null;
  const catalogReady = tenant?.catalog_status === "ready";
  return <section className="ai-studio-page">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--surface-2)] p-4 text-sm">
      <p><b>Не про текст витрины?</b> <span className="muted">Опишите вопрос команде Dukenim напрямую.</span></p>
      <Link href="/admin/requests?source=ai-studio" className="btn btn-secondary shrink-0"><MessageSquare size={16}/> Нужна помощь человека <ArrowRight size={15}/></Link>
    </div>
    <div className="ai-studio-hero"><span className="data-label">РАБОЧИЙ ЦЕНТР ВЛАДЕЛЬЦА · AI STUDIO</span><Sparkles size={28}/><h1>Соберите магазин<br/>вместе с AI.</h1><p>AI помогает подготовить каталог, тексты и визуальные материалы. Вы проверяете каждый результат и сами решаете, что публиковать.</p></div>
    <AiStudioClient enabled={brand && status.configured} imageEnabled={brand && status.imageConfigured} brand={brand} catalogReady={catalogReady} />
  </section>;
}
