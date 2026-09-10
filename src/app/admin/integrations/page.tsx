import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { PaymentConnectionGuide } from "@/components/admin/payment-connection-guide";
import { requireRole } from "@/lib/auth";
import {
  integrationConnectionModeLabel,
  integrationProviderGroups,
  integrationProviders,
  isIntegrationProvider,
} from "@/lib/integrations/providers";
import { createClient } from "@/lib/supabase/server";
import { saveCrmIntegrationRequest } from "./actions";

const statuses: Record<string, { title: string; description: string }> = {
  not_selected: { title: "Система не выбрана", description: "Выберите нужную CRM, учётную систему или POS из каталога ниже." },
  details_later: { title: "Вернёмся к подключению позже", description: "Система сохранена отдельно. К её настройке можно вернуться в любой момент." },
  credentials_needed: { title: "Нужен аккаунт поставщика", description: "Пароль не требуется: после технической проверки появится безопасный шаг OAuth или ключа." },
  submitted: { title: "Заявка в очереди", description: "Проверяем официальный API и условия подключения именно этой системы." },
  preflight: { title: "Проверяем возможности API", description: "Сопоставляем заказы, клиентов, товары и остатки до включения синхронизации." },
  waiting_owner: { title: "Требуется подтверждение владельца", description: "Постоянный доступ, договор или платный стенд не включается автоматически." },
  connected: { title: "Система подключена", description: "Подключение получило разрешение магазина; фактический обмен включается только после теста." },
  failed: { title: "Нужна дополнительная проверка", description: "Покажем безопасную причину и следующий шаг без раскрытия ключей." },
  revoked: { title: "Подключение отключено", description: "Каталог и Dukenim CRM продолжают работать самостоятельно." },
};

const statusNames: Record<string, string> = {
  details_later: "Запланировано",
  credentials_needed: "Нужен аккаунт",
  submitted: "В очереди",
  preflight: "Preflight",
  waiting_owner: "Ждёт владельца",
  connected: "Подключено",
  failed: "Требует внимания",
  revoked: "Отключено",
};

type IntegrationRequest = {
  provider: string;
  account_url: string | null;
  admin_contact: string | null;
  sync_direction: string;
  notes: string | null;
  status: string;
  updated_at: string;
};

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ planfix?: string; provider?: string }>;
}) {
  const { tenantId } = await requireRole(["owner"]);
  const params = await searchParams;
  const planfixConfigured = Boolean(
    process.env.PLANFIX_CLIENT_ID
      && process.env.PLANFIX_CLIENT_SECRET
      && process.env.PLANFIX_REDIRECT_URI
      && process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY,
  );
  let paymentPreference = "later";
  let requests: IntegrationRequest[] = [];
  let requestsUnavailable = false;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const client = await createClient();
    const [settings, requestResult] = await Promise.all([
      client.from("tenant_settings").select("payment_setup_preference").eq("tenant_id", tenantId!).maybeSingle(),
      client.from("crm_integration_requests")
        .select("provider,account_url,admin_contact,sync_direction,notes,status,updated_at")
        .eq("tenant_id", tenantId!)
        .order("updated_at", { ascending: false }),
    ]);
    paymentPreference = settings.data?.payment_setup_preference ?? "later";
    requests = requestResult.data ?? [];
    requestsUnavailable = Boolean(requestResult.error);
  }

  const byProvider = new Map(requests.map((request) => [request.provider, request]));
  const requestedProvider = typeof params.provider === "string" && isIntegrationProvider(params.provider)
    ? params.provider
    : null;
  const latestProvider = requests.find((request) => isIntegrationProvider(request.provider))?.provider ?? null;
  const selectedProvider = requestedProvider ?? latestProvider ?? "";
  const selectedRequest = selectedProvider ? byProvider.get(selectedProvider) ?? null : null;
  const selectedDefinition = integrationProviders.find((provider) => provider.key === selectedProvider);
  const current = statuses[selectedRequest?.status ?? "not_selected"];
  const planfixRequest = byProvider.get("planfix");

  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="data-label">ИНТЕГРАЦИИ</p>
        <h1 className="mt-2 text-4xl font-extrabold">Подключения магазина</h1>
        <p className="mt-3 max-w-3xl text-[var(--ink-60)]">Подключайте несколько CRM, учётных систем и ресторанных POS независимо. Каждая система получает только разрешение конкретного магазина.</p>
      </div>
      <Link href="/admin/ai-studio" className="btn btn-secondary">В AI Studio <ArrowRight size={17}/></Link>
    </div>

    {params.planfix === "connected" && <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-900">Planfix подключён. Передача реальных заказов выполняется вручную со страницы заказов.</div>}
    {params.planfix && params.planfix !== "connected" && <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-950">Не удалось завершить подключение Planfix. Повторите вход или обратитесь в поддержку Dukenim.</div>}

    <PaymentConnectionGuide preference={paymentPreference}/>

    {requestsUnavailable && <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-950">Не удалось загрузить сохранённые статусы интеграций. Каталог доступен, но перед изменением заявки обновите страницу.</div>}

    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="data-label">КАТАЛОГ СИСТЕМ</p><h2 className="mt-2 text-2xl font-extrabold">Все подключения в одном месте</h2></div>
        <span className="badge">{integrationProviders.length} ВАРИАНТОВ</span>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-60)]">Наличие карточки означает официальный маршрут на проверку, а не готовую интеграцию. Рабочий статус показывается отдельно для каждой системы.</p>
      <div className="mt-5 grid gap-5">
        {integrationProviderGroups.map((group) => <div key={group.key}>
          <h3 className="mb-3 text-sm font-extrabold text-[var(--ink-60)]">{group.label}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.providers.map((provider) => {
              const request = byProvider.get(provider.key);
              const selected = selectedProvider === provider.key;
              const state = request ? statusNames[request.status] ?? request.status : provider.key === "planfix" ? "Пилот доступен" : "Не настроено";
              return <Link
                key={provider.key}
                href={`/admin/integrations?provider=${provider.key}#request-connector`}
                className={`rounded-2xl border p-4 transition hover:border-[var(--accent)] ${selected ? "border-[var(--accent)] bg-[var(--surface-muted)]" : "border-[var(--line)] bg-white"}`}
              >
                <div className="flex items-start justify-between gap-3"><b>{provider.label}</b><span className="badge">{state}</span></div>
                <p className="mt-3 text-xs leading-5 text-[var(--ink-60)]">{integrationConnectionModeLabel(provider.connection)}</p>
              </Link>;
            })}
          </div>
        </div>)}
      </div>
    </section>

    <section id="request-connector" className="mt-8 grid gap-6 lg:grid-cols-[.88fr_1.12fr]">
      <aside className="panel-dark rounded-[var(--r-card)] p-6">
        <div className="flex items-center gap-3 text-[var(--accent-bright)]"><Clock3 size={21}/><span className="data-label text-[var(--accent-bright)]">СТАТУС</span></div>
        <h2 className="mt-6 text-2xl font-extrabold">{current.title}</h2>
        <p className="mt-3 text-sm leading-6 text-white/65">{current.description}</p>
        {selectedDefinition && <p className="mt-4 rounded-xl bg-white/7 p-3 text-sm"><b>{selectedDefinition.label}</b><span className="mt-1 block text-white/55">{integrationConnectionModeLabel(selectedDefinition.connection)}</span></p>}
        <div className="mt-8 space-y-4 border-t border-white/12 pt-5 text-sm">
          <p className="flex gap-3"><ShieldCheck size={18} className="shrink-0 text-[var(--accent-bright)]"/>Не просим пароль от CRM, учёта или POS.</p>
          <p className="flex gap-3"><CheckCircle2 size={18} className="shrink-0 text-[var(--accent-bright)]"/>Каждое подключение проверяется отдельно и не заменяет разрешение магазина.</p>
        </div>
      </aside>

      <form action={saveCrmIntegrationRequest} className="card p-6">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-extrabold">Запросить подключение</h2><p className="mt-1 text-sm text-[var(--ink-60)]">Можно вести несколько заявок одновременно. Пароли и API-ключи сюда не вставляются.</p></div><span className="badge">0 ₸ НА ЗАПУСКЕ</span></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">CRM, учёт или POS
            <select name="provider" className="input" defaultValue={selectedProvider} required>
              <option value="" disabled>Выберите систему</option>
              {integrationProviderGroups.map((group) => <optgroup key={group.key} label={group.label}>{group.providers.map((provider) => <option key={provider.key} value={provider.key}>{provider.label}</option>)}</optgroup>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">Что синхронизировать
            <select name="syncDirection" className="input" defaultValue={selectedRequest?.sync_direction ?? "orders_and_customers"}>
              <option value="orders_and_customers">Заказы и клиенты</option>
              <option value="orders_only">Только заказы</option>
              <option value="stock_and_products">Товары и остатки</option>
              <option value="consultation">Нужна консультация</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">Ссылка на аккаунт CRM <input name="accountUrl" className="input" type="url" defaultValue={selectedRequest?.account_url ?? ""} placeholder="https://company.example.com"/></label>
          <label className="grid gap-2 text-sm font-bold">Контакт администратора <input name="adminContact" className="input" defaultValue={selectedRequest?.admin_contact ?? ""} placeholder="Имя и рабочий email"/></label>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-bold">Комментарий <textarea name="notes" className="input min-h-28 resize-y" defaultValue={selectedRequest?.notes ?? ""} placeholder="Например: сначала передаём только новые заказы."/></label>
        <p className="mt-4 text-xs leading-5 text-[var(--ink-60)]">Не вставляйте пароль, секретный ключ или webhook в эту форму. Если понадобится доступ, появится отдельный защищённый шаг.</p>
        <div className="mt-6 flex flex-wrap gap-3"><button className="btn btn-cta" type="submit" name="intent" value="submit">Отправить на проверку <ArrowRight size={17}/></button><button className="btn btn-secondary" type="submit" name="intent" value="later">Добавить позже</button></div>
      </form>
    </section>

    {(selectedProvider === "planfix" || planfixRequest) && <section className="card mt-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="data-label">PLANFIX PILOT</p><h2 className="mt-2 text-xl font-extrabold">Подключить аккаунт безопасно</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-60)]">Вы входите на стороне Planfix и подтверждаете только контакты и задачи. Пароль Planfix в Dukenim не передаётся.</p></div>
        {planfixRequest?.status === "connected" ? <span className="badge">ПОДКЛЮЧЕНО</span> : planfixConfigured ? <Link href="/api/integrations/planfix/connect" className="btn btn-cta">Подключить Planfix <ArrowRight size={17}/></Link> : <span className="badge">НАСТРОЙКА ПИЛОТА</span>}
      </div>
    </section>}
  </div>;
}
