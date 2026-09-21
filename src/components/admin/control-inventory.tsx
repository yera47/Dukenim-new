import Link from "next/link";

const ready = [
  ["Магазины", "Список, переключение, создание и удаление магазина без заказов или оплат.", "/stores"],
  ["Каталог и витрина", "Товары, фото, варианты, состав и комбо для еды, оформление и публикация.", "/admin/catalog"],
  ["Продажи", "Заказы, статусы, самовывоз и собственная или ручная курьерская доставка.", "/admin/orders"],
  ["Клиенты и лояльность", "История заказов, правила наград, приглашение друга; гостевая история в текущем браузере.", "/admin/settings/loyalty"],
  ["Команда и продвижение", "Приглашения сотрудников, права, акции и истории для еды.", "/admin/team"],
  ["Настройки", "Тариф, домен, поддержка, доставка и запрос на подключение CRM.", "/admin/settings"],
] as const;

const gaps = [
  "Реальный SMS-код и рассылка от имени магазина: нужен договор с провайдером, ключ и одобренный Sender ID.",
  "Сквозная проверка оплаты покупателя и расчётов с продавцом; сейчас нельзя считать онлайн-эквайринг готовым для всех магазинов.",
  "Подключение внешней CRM для каждого продавца: запрос и оплата настройки есть, доступы и проверки сторонних систем выполняются отдельно.",
  "Управление резервными копиями и проверенное восстановление из интерфейса владельца платформы.",
  "Единый root-кабинет для владельцев аккаунтов, возвратов, финансовых сверок и полного экспорта журнала действий.",
] as const;

export function ControlInventory({ root = false }: { root?: boolean }) {
  return <section className="mt-10 grid gap-5 lg:grid-cols-2" aria-label="Возможности и задачи платформы">
    <div className="card p-6"><h2 className="text-xl font-extrabold">Что уже доступно</h2><div className="mt-4 divide-y divide-[var(--line)]">{ready.map(([title, description, href]) => <div key={title} className="py-4"><b>{title}</b><p className="muted mt-1 text-sm">{description}</p>{root ? null : <Link href={href} className="mt-2 inline-block text-sm font-bold text-[var(--accent)]">Открыть →</Link>}</div>)}</div></div>
    <div className="card p-6"><h2 className="text-xl font-extrabold">Что ещё нужно для полного управления</h2><p className="muted mt-2 text-sm">Эти пункты не следует обещать продавцам как уже работающие.</p><ol className="mt-4 list-decimal space-y-4 pl-5 text-sm leading-6">{gaps.map(item => <li key={item}>{item}</li>)}</ol></div>
  </section>;
}
