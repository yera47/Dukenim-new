import Link from "next/link";
import { ArrowRight, Send, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOwnerMessages, getOwnerRequests } from "@/lib/queries/owner";
import { sendRequest } from "@/app/admin/actions";
import type { Database, Json } from "@/types/database";
import { integrationProviders } from "@/lib/integrations/providers";

type Message = Database["public"]["Tables"]["messages"]["Row"];
type RequestRow = Database["public"]["Tables"]["change_requests"]["Row"];

const allowedSources = new Set<RequestRow["source"]>(["support", "ai-studio", "catalog", "orders", "settings", "integrations"]);
const sourceLabels: Record<RequestRow["source"], string> = {
  support: "Поддержка",
  "ai-studio": "AI Studio",
  catalog: "Каталог",
  orders: "Заказы",
  settings: "Настройки",
  integrations: "Интеграции",
};

function contextLabel(value: Json) {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const intent = value.ai_intent;
  return typeof intent === "string" && intent ? `Сценарий: ${intent}` : null;
}

export default async function Requests({ searchParams }: { searchParams: Promise<{ source?: string; intent?: string; provider?: string }> }) {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  const query = await searchParams;
  const source = allowedSources.has(query.source as RequestRow["source"])
    ? query.source as RequestRow["source"]
    : "support";
  const aiIntent = source === "ai-studio" ? String(query.intent ?? "").slice(0, 50) : "";
  const paymentIntent = source === "integrations" && (query.intent === "card-payments" || query.intent === "kaspi-payments") ? query.intent : null;
  const provider = source === "integrations" ? integrationProviders.find(p=>p.key===query.provider) : undefined;
  const subject = provider ? `Статус подключения ${provider.label}` : paymentIntent ? `Подключение ${paymentIntent === "kaspi-payments" ? "Kaspi Pay" : "оплаты картой"}` : source === "ai-studio" ? `Вопрос по AI Studio${aiIntent ? ` · ${aiIntent}` : ""}` : "Обращение в поддержку";
  let messages: Message[] = [];
  let requests: RequestRow[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const client = await createClient();
    const [messageResult, requestResult] = await Promise.all([
      getOwnerMessages(client, tenantId!),
      getOwnerRequests(client, tenantId!),
    ]);
    messages = messageResult.data ?? [];
    requests = requestResult.data ?? [];
  }

  return <>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="data-label">ЖИВОЙ КАНАЛ DUKENIM</p><h1 className="mt-2 text-3xl font-extrabold">Поддержка и заявки</h1></div>
      <Link href="/admin/ai-studio" className="btn btn-secondary shrink-0"><Sparkles size={16}/> Спросить AI <ArrowRight size={15}/></Link>
    </div>
    {source === "ai-studio" && <div className="mt-5 rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--accent-soft)] p-4 text-sm"><b>Контекст AI Studio сохранится вместе с обращением.</b><span className="muted mt-1 block">Команда увидит, из какого сценария вы пришли; добавьте в сообщении, какой результат ожидали.</span></div>}
    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="card p-6">
        <div className="h-80 space-y-4 overflow-auto rounded-[var(--r-card)] bg-slate-50 p-4">
          {messages.length ? messages.map((message) => <div key={message.id} className={`max-w-[82%] rounded-[var(--r-card)] p-4 text-sm ${message.from_role === "owner" ? "ml-auto bg-[var(--accent)] text-white" : "bg-white"}`}>{message.text}</div>) : <p className="muted text-center">Напишите команде Dukenim — обращение сразу появится в очереди.</p>}
        </div>
        <form action={sendRequest} className="mt-4 grid gap-3">
          <input type="hidden" name="source" value={source}/>
          <input type="hidden" name="pagePath" value={source === "ai-studio" ? "/admin/ai-studio" : "/admin/requests"}/>
          <input type="hidden" name="aiIntent" value={aiIntent}/>
          <label className="text-sm font-extrabold">Тема<input name="subject" required minLength={2} maxLength={120} defaultValue={subject} className="input mt-2"/></label>
          <label className="text-sm font-extrabold">Сообщение<textarea name="text" required minLength={2} maxLength={3000} className="input mt-2 min-h-28 resize-y" defaultValue={provider ? `Здравствуйте! Хотел узнать статус подключения ${provider.label} к моему магазину. Какой следующий шаг и нужны ли данные с моей стороны?` : paymentIntent ? `Хочу подключить ${paymentIntent === "kaspi-payments" ? "Kaspi Pay" : "оплату картой"} для своего магазина.\nНужна помощь со следующим шагом.` : ""} placeholder="Опишите задачу, ожидаемый результат и что уже пробовали."/></label>
          {paymentIntent && <p className="text-xs leading-5 text-neutral-500">Укажите только название провайдера и статус заявки. Не отправляйте API-ключи, банковские реквизиты, пароли или коды подтверждения.</p>}
          <button className="btn btn-primary justify-self-start"><Send size={17}/> Отправить в поддержку</button>
        </form>
      </section>
      <aside className="card p-5"><h2 className="font-bold">Мои заявки</h2>{requests.length ? requests.map((request) => {
        const detail = contextLabel(request.context);
        return <article key={request.id} className="mt-4 border-t pt-4"><div className="flex flex-wrap items-center gap-2"><span className="badge">{sourceLabels[request.source]}</span><span className="badge">{request.status}</span></div><h3 className="mt-3 font-extrabold"><Link className="underline" href={`/admin/requests/${request.id}`}>{request.subject}</Link></h3><p className="mt-1 text-sm text-[var(--ink-60)]">{request.text}</p>{detail && <small className="mt-2 block text-[var(--ink-40)]">{detail}</small>}</article>;
      }) : <p className="muted mt-4 text-sm">Заявок пока нет.</p>}</aside>
    </div>
  </>;
}
