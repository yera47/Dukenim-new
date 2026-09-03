import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveCrmIntegrationRequest } from "./actions";

const statuses: Record<string, { title: string; description: string }> = {
  not_selected: { title: "CRM не выбрана", description: "Это не мешает заказам, каталогу и работе команды." },
  details_later: { title: "Вернёмся к CRM позже", description: "Вы сможете открыть эту страницу в любой момент." },
  credentials_needed: { title: "Нужны данные аккаунта", description: "Укажите URL CRM и контакт администратора — пароль не нужен." },
  submitted: { title: "Заявка в очереди", description: "Проверим API и сообщим следующий шаг в кабинете." },
  preflight: { title: "Проверяем возможности API", description: "Сопоставляем заказы, клиентов и остатки до включения синхронизации." },
  waiting_owner: { title: "Требуется ваше подтверждение", description: "Ничего не включаем без согласования владельца." },
  connected: { title: "CRM подключена", description: "Синхронизация включается только после успешной технической проверки." },
  failed: { title: "Нужна дополнительная проверка", description: "Команда объяснит, какие данные или права нужны." },
  revoked: { title: "Подключение отключено", description: "Каталог и Dukenim CRM продолжают работать самостоятельно." },
};

export default async function IntegrationsPage() {
  const { tenantId } = await requireRole(["owner"]);
  let request: { provider: string; account_url: string | null; admin_contact: string | null; sync_direction: string; notes: string | null; status: string } | null = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const client = await createClient();
    request = (await client.from("crm_integration_requests").select("provider,account_url,admin_contact,sync_direction,notes,status").eq("tenant_id", tenantId!).maybeSingle()).data;
  }
  const current = statuses[request?.status ?? "not_selected"];

  return <div className="mx-auto max-w-5xl">
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="data-label">ИНТЕГРАЦИИ</p><h1 className="mt-2 text-4xl font-extrabold">Ваша CRM — в одном рабочем потоке.</h1><p className="mt-3 max-w-2xl text-[var(--ink-60)]">Подключение не блокирует запуск магазина. Сначала отправьте безопасную заявку, затем мы подтвердим техническую совместимость.</p></div><Link href="/admin" className="btn btn-secondary">К обзору <ArrowRight size={17}/></Link></div>

    <section className="mt-8 grid gap-6 lg:grid-cols-[.88fr_1.12fr]"><aside className="panel-dark rounded-[var(--r-card)] p-6"><div className="flex items-center gap-3 text-[var(--accent-bright)]"><Clock3 size={21}/><span className="data-label text-[var(--accent-bright)]">СТАТУС</span></div><h2 className="mt-6 text-2xl font-extrabold">{current.title}</h2><p className="mt-3 text-sm leading-6 text-white/65">{current.description}</p><div className="mt-8 space-y-4 border-t border-white/12 pt-5 text-sm"><p className="flex gap-3"><ShieldCheck size={18} className="shrink-0 text-[var(--accent-bright)]"/>Не просим пароль от Bitrix24, Kommo, МойСклад или другой CRM.</p><p className="flex gap-3"><CheckCircle2 size={18} className="shrink-0 text-[var(--accent-bright)]"/>70 000 ₸ → 0 ₸ на запуске, после технического preflight.</p></div></aside>
      <form action={saveCrmIntegrationRequest} className="card p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-extrabold">Запросить подключение</h2><p className="mt-1 text-sm text-[var(--ink-60)]">Можно заполнить частично. Поля с доступом будут запрошены только после проверки.</p></div><span className="badge">0 ₸ НА ЗАПУСКЕ</span></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold">CRM<select name="provider" className="input" defaultValue={request?.provider === "not_selected" ? "" : request?.provider ?? ""} required><option value="" disabled>Выберите систему</option><option value="bitrix24">Bitrix24</option><option value="kommo">Kommo</option><option value="moysklad">МойСклад</option><option value="retailcrm">retailCRM</option><option value="one_c">1С</option><option value="other">Другая CRM</option></select></label><label className="grid gap-2 text-sm font-bold">Что синхронизировать<select name="syncDirection" className="input" defaultValue={request?.sync_direction ?? "orders_and_customers"}><option value="orders_and_customers">Заказы и клиенты</option><option value="orders_only">Только заказы</option><option value="stock_and_products">Товары и остатки</option><option value="consultation">Нужна консультация</option></select></label></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold">Ссылка на аккаунт CRM <input name="accountUrl" className="input" type="url" defaultValue={request?.account_url ?? ""} placeholder="https://company.bitrix24.ru"/></label><label className="grid gap-2 text-sm font-bold">Контакт администратора <input name="adminContact" className="input" defaultValue={request?.admin_contact ?? ""} placeholder="Имя и рабочий email"/></label></div>
        <label className="mt-4 grid gap-2 text-sm font-bold">Комментарий <textarea name="notes" className="input min-h-28 resize-y" defaultValue={request?.notes ?? ""} placeholder="Например: переносим заказы из Bitrix24, доступ к API добавим после согласования."/></label>
        <p className="mt-4 text-xs leading-5 text-[var(--ink-60)]">Не вставляйте пароль, секретный ключ или webhook в эту форму. Если понадобится доступ, вы увидите отдельный защищённый следующий шаг.</p>
        <div className="mt-6 flex flex-wrap gap-3"><button className="btn btn-cta" type="submit" name="intent" value="submit">Отправить на проверку <ArrowRight size={17}/></button><button className="btn btn-secondary" type="submit" name="intent" value="later">Добавить позже</button></div>
      </form></section>
  </div>;
}
