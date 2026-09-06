import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DukenimLogo } from "@/components/dukenim-logo";

export const dynamic = "force-dynamic";

export default async function DiagnosticsPage() {
  const context = await requireRole(["superadmin"]);
  const configured = (names: string[]) => names.every(name => Boolean(process.env[name]?.trim()));
  const checks = [
    ["Авторизация", configured(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]), "Проверка наличия настроек, не тест входа."],
    ["Сервер базы данных", configured(["SUPABASE_SERVICE_ROLE_KEY"]), "Привилегированный ключ не отображается в интерфейсе."],
    ["Polar — подписки", configured(["POLAR_ACCESS_TOKEN", "POLAR_WEBHOOK_SECRET", "POLAR_BASIC_MONTHLY_PRODUCT_ID", "POLAR_BASIC_ANNUAL_PRODUCT_ID", "POLAR_STANDARD_MONTHLY_PRODUCT_ID", "POLAR_STANDARD_ANNUAL_PRODUCT_ID"]), "Наличие переменных не подтверждает доступ к товарам и успешную оплату."],
    ["Генерация изображений", configured(["FAL_KEY"]), "Доступность модели и баланс проверяются отдельным реальным запросом."],
    ["Защита фоновых задач", configured(["CRON_SECRET"]), "Расписание и успешная доставка уведомлений требуют отдельной проверки."],
  ] as const;
  let database = "Локальный просмотр: соединение не проверялось";
  let events: { id: string; action: string; created_at: string; tenant_id: string | null }[] = [];
  let auditError = false;
  if (context.user) {
    const client = await createClient();
    const [probe, audit] = await Promise.all([
      client.from("tenants").select("id", { count: "exact", head: true }),
      client.from("platform_audit_events").select("id,action,created_at,tenant_id").order("created_at", { ascending: false }).limit(30),
    ]);
    database = probe.error ? "Ошибка проверки соединения или прав доступа" : "Соединение и чтение магазинов подтверждены";
    auditError = Boolean(audit.error);
    events = audit.data ?? [];
  }
  return <main className="min-h-screen bg-[var(--bg)] px-5 py-8"><div className="mx-auto max-w-5xl">
    <header className="flex flex-wrap items-center justify-between gap-5 border-b border-[var(--line)] pb-6"><Link href="/root"><DukenimLogo/></Link><Link href="/root" className="btn btn-secondary">Все магазины</Link></header>
    <h1 className="mt-10 text-4xl font-bold">Диагностика платформы</h1><p className="mt-4 max-w-2xl leading-7 text-[var(--ink-60)]">Конфигурация, доступ к базе и последние административные события. Здесь нет кнопок, которые выполняют произвольный код или обходят авторизацию.</p>
    <div className="my-7 rounded-2xl border border-[var(--line)] bg-white p-5"><b>База данных</b><p className="mt-2 text-sm">{database}</p></div>
    <section className="grid gap-4 md:grid-cols-2" aria-label="Проверка конфигурации">{checks.map(([title, ready, description]) => <article key={title} className="rounded-2xl border border-[var(--line)] bg-white p-6"><h2 className="font-bold">{title}</h2><p className="my-3 text-sm font-semibold">{ready ? "Настройки присутствуют" : "Настройки неполные"}</p><p className="text-sm leading-6 text-[var(--ink-60)]">{description}</p></article>)}</section>
    <nav className="my-8 flex flex-wrap gap-3" aria-label="Инструменты диагностики"><Link href="/root/ai" className="btn btn-primary">Проверить AI</Link><Link href="/root/integrations" className="btn btn-secondary">Очередь интеграций</Link><a href="https://vercel.com/yersat47-s-projects/dukenim-new/logs" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Логи Vercel ↗</a></nav>
    <section className="rounded-2xl border border-[var(--line)] bg-white p-6"><h2 className="text-xl font-bold">Последние административные события</h2><p className="my-3 text-sm text-[var(--ink-60)]">Последние 30 записей. Секреты и содержимое обращений здесь не выводятся.</p>{auditError ? <p role="alert">Не удалось прочитать журнал. Это не означает, что событий нет.</p> : events.length ? <ul className="divide-y divide-neutral-200">{events.map(event => <li key={event.id} className="flex flex-wrap justify-between gap-3 py-4 text-sm"><span>{event.action}</span><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString("ru-KZ", { timeZone: "Asia/Almaty" })}</time>{event.tenant_id && <Link className="underline" href={`/root?tenant=${event.tenant_id}`}>Открыть магазин</Link>}</li>)}</ul> : <p className="text-sm">{context.user ? "Записей пока нет." : "Для чтения журнала требуется настоящий вход."}</p>}</section>
    <p className="mt-6 text-sm leading-6 text-[var(--ink-60)]">Восстановление резервной копии, изменение DNS и платёжные споры выполняются в соответствующих сервисах. Этот экран не заявляет, что резервное восстановление или выплаты уже проверены.</p>
  </div></main>;
}
