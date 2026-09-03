import Link from "next/link";
import { ArrowRight, MessageSquare, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { tenantHasPlan } from "@/lib/plan-access";
import { getAiStudioStatus } from "@/lib/ai/studio";
import { AiStudioClient } from "./ai-studio-client";

export default async function AiStudioPage() {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  const brand = tenantId ? await tenantHasPlan(tenantId, "standard") : false;
  const status = getAiStudioStatus();
  return <section className="ai-studio-page">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--surface-2)] p-4 text-sm">
      <p><b>Не про текст витрины?</b> <span className="muted">Опишите вопрос команде Dukenim напрямую.</span></p>
      <Link href="/admin/requests" className="btn btn-secondary shrink-0"><MessageSquare size={16}/> Написать в поддержку <ArrowRight size={15}/></Link>
    </div>
    <div className="ai-studio-hero"><span className="data-label">BRAND / AI STUDIO</span><Sparkles size={28}/><h1>Черновики витрины<br/>под вашим контролем.</h1><p>AI создаёт только тексты для витрины и акций. Он не отвечает на посторонние вопросы, не меняет код и никогда не публикует изменения сам.</p></div>
    <AiStudioClient enabled={brand && status.configured} brand={brand} />
  </section>;
}
