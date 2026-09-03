import Link from "next/link";
import { ArrowLeft, Bot, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getAzureFoundryStatus } from "@/lib/ai/azure-foundry";
import { AiTester } from "./ai-tester";

export default async function RootAiPage() {
  await requireRole(["superadmin"]);
  const status = getAzureFoundryStatus();
  return <main className="min-h-screen bg-[#0c1713] text-white"><header className="border-b border-white/10"><div className="container flex h-20 items-center justify-between"><Link href="/root" className="inline-flex items-center gap-2 text-sm font-bold text-white/70 hover:text-white"><ArrowLeft size={17}/>К центру управления</Link><span className="badge bg-white/9 text-[var(--accent-bright)]">AZURE AI</span></div></header><div className="container max-w-3xl py-10"><div className="flex items-center gap-3"><Bot className="text-[var(--accent-bright)]"/><h1 className="text-4xl font-extrabold">Модель Dukenim</h1></div><p className="mt-3 text-white/55">Закрытая серверная интеграция Microsoft Foundry. Ключ никогда не отправляется в браузер и не отображается на странице.</p><section className="mt-8 rounded-[14px] bg-white/7 p-6"><div className="flex items-start justify-between gap-4"><div><p className="data-label text-white/40">СОСТОЯНИЕ</p><h2 className="mt-2 text-xl font-extrabold">{status.configured ? "Готово к проверке" : "Нужны секреты окружения"}</h2><p className="mt-2 text-sm text-white/50">Deployment: {status.deployment ?? "не задан"}</p></div><ShieldCheck className={status.configured ? "text-[var(--accent-bright)]" : "text-white/30"}/></div><AiTester configured={status.configured}/></section></div></main>;
}
