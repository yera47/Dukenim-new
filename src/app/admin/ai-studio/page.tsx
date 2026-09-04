import Link from "next/link";
import { ArrowRight, MessageSquare, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { tenantEntitlement } from "@/lib/plan-access";
import { planMonthlyAiCredits } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/queries/owner";
import { getAiStudioStatus } from "@/lib/ai/studio";
import { AiStudioClient } from "./ai-studio-client";

export default async function AiStudioPage() {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  const entitlement = tenantId ? await tenantEntitlement(tenantId) : { active: false, plan: "basic" as const, trialActive: false, expired: false };
  const status = getAiStudioStatus();

  let creditsRemaining: number | null = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && tenantId) {
    const { data: tenant } = await getTenant(await createClient(), tenantId);
    if (tenant) creditsRemaining = tenant.ai_credits_reset_at && new Date(tenant.ai_credits_reset_at).getTime() <= Date.now() ? planMonthlyAiCredits[entitlement.plan] : tenant.ai_credit_balance;
  }

  return <section className="ai-studio-page">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--surface-2)] p-4 text-sm">
      <p><b>Не про текст витрины?</b> <span className="muted">Опишите вопрос команде Dukenim напрямую.</span></p>
      <Link href="/admin/requests" className="btn btn-secondary shrink-0"><MessageSquare size={16} /> Написать в поддержку <ArrowRight size={15} /></Link>
    </div>
    <div className="ai-studio-hero"><span className="data-label">AI STUDIO</span><Sparkles size={28} /><h1>Черновики витрины<br />под вашим контролем.</h1><p>AI создаёт тексты, структуру каталога и рекламные баннеры для витрины. Он не отвечает на посторонние вопросы, не меняет код и никогда не публикует изменения сам.</p></div>
    <AiStudioClient enabled={entitlement.active && status.configured} creditsRemaining={entitlement.active ? creditsRemaining : null} />
    {!entitlement.active && <p className="ai-studio-note mt-4">Подписка сейчас неактивна. <Link href="/admin/plan" className="font-bold underline">Открыть тариф →</Link></p>}
  </section>;
}
