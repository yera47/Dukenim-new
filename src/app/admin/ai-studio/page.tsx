import { Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { tenantHasPlan } from "@/lib/plan-access";
import { getAiStudioStatus } from "@/lib/ai/studio";
import { AiStudioClient } from "./ai-studio-client";

export default async function AiStudioPage() {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  const brand = tenantId ? await tenantHasPlan(tenantId, "standard") : false;
  const status = getAiStudioStatus();
  return <section className="ai-studio-page"><div className="ai-studio-hero"><span className="data-label">BRAND / AI STUDIO</span><Sparkles size={28}/><h1>Черновики витрины<br/>под вашим контролем.</h1><p>AI создаёт только тексты для витрины и акций. Он не отвечает на посторонние вопросы, не меняет код и никогда не публикует изменения сам.</p></div><AiStudioClient enabled={brand && status.configured} brand={brand} /></section>;
}
