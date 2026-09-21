import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Package,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/demo-data";
import { smsClient } from "@/lib/sms-db";
import { updateRootProduct,deleteEmptyStore,reviewSmsSender } from "../../actions";

export default async function RootStorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await createClient();
  const [
    tenantResult,
    productsResult,
    categoriesResult,
    ordersResult,
    auditResult,
    smsResult,
    settingsResult,
    zonesResult,
    loyaltyResult,
    storiesResult,
  ] = await Promise.all([
    client.from("tenants").select("*").eq("id", id).single(),
    client
      .from("products")
      .select("*")
      .eq("tenant_id", id)
      .order("created_at", { ascending: false }),
    client
      .from("categories")
      .select("id,name")
      .eq("tenant_id", id)
      .order("sort_order"),
    client
      .from("orders")
      .select("id,total,status,payment_status,created_at")
      .eq("tenant_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    client
      .from("platform_audit_events")
      .select("id,action,reason,created_at")
      .eq("tenant_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    smsClient(client).from("tenant_sms_settings").select("*").eq("tenant_id", id).maybeSingle(),
    client.from("tenant_settings").select("delivery_enabled,pickup_enabled,payment_online,payment_provider,min_order").eq("tenant_id",id).maybeSingle(),
    client.from("delivery_zones").select("name,provider,cost,is_active").eq("tenant_id",id),
    client.from("loyalty_programs").select("name,enabled").eq("tenant_id",id).maybeSingle(),
    client.from("food_stories").select("id,status").eq("tenant_id",id),
  ]);
  if (tenantResult.error || !tenantResult.data) notFound();
  const tenant = tenantResult.data;
  const products = productsResult.data ?? [];
  const categories = categoriesResult.data ?? [];
  const orders = ordersResult.data ?? [];
  const events = auditResult.data ?? [];
  const sms = smsResult.data;
  if(settingsResult.error||zonesResult.error||loyaltyResult.error||storiesResult.error)throw new Error("Не удалось загрузить настройки магазина.");
  const settings = settingsResult.data;
  const revenue = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + order.total, 0);
  return (
    <main className="min-h-screen bg-[#0c1713] pb-16 text-white">
      <header className="border-b border-white/10">
        <div className="container flex min-h-20 flex-wrap items-center justify-between gap-3 py-4">
          <Link
            href="/root"
            className="inline-flex items-center gap-2 text-sm font-bold text-white/65 hover:text-white"
          >
            <ArrowLeft size={17} />
            Центр управления
          </Link>
          <div className="flex gap-3">
            <Link
              href={`/root?tenant=${tenant.id}`}
              className="btn border border-white/15 bg-white/7 text-white"
            >
              Поддержка
            </Link>
            <Link
              href={`/s/${tenant.slug}`}
              target="_blank"
              className="btn bg-white !text-black"
            >
              Открыть витрину <ExternalLink size={16} />
            </Link>
          </div>
        </div>
      </header>
      <div className="container py-10">
        <p className="data-label text-white/40">МАГАЗИН · /s/{tenant.slug}</p>
        <h1 className="mt-2 text-4xl font-extrabold">{tenant.name}</h1>
        <details className="mt-5 rounded-xl border border-red-300/40 p-4"><summary className="cursor-pointer">Удалить магазин</summary><p className="mt-3 text-sm">Безвозвратно удаляет магазин, его товары, черновики и настройки. Аккаунт владельца остаётся. Если есть заказы, клиенты, платежи или активные подключения, удаление запрещено — приостановите магазин.</p><form action={deleteEmptyStore} className="mt-4 grid gap-3"><input type="hidden" name="tenantId" value={tenant.id}/><label>Для подтверждения введите {tenant.slug}<input name="confirmSlug" required className="input text-black" autoComplete="off"/></label><label>Причина<input name="reason" required minLength={3} maxLength={1000} className="input text-black"/></label><button className="btn bg-red-800 text-white">Удалить безвозвратно</button></form></details>
        <p className="mt-3 text-white/55">
          Безопасное операционное управление. Удаление заменено на обратимое
          скрытие товара; каждое изменение требует причину и записывает
          состояние до/после.
        </p>
        <section className="mt-8 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Товары", products.length],
            ["Опубликовано", products.filter((p) => p.is_active).length],
            ["Заказы · последние 20", orders.length],
            ["Сумма заказов · последние 20", money(revenue)],
          ].map(([label, value]) => (
            <article key={label} className="bg-[#11201a] p-5">
              <small className="text-white/40">{label}</small>
              <b className="mt-4 block text-2xl">{value}</b>
            </article>
          ))}
        </section>
        <section className="mt-8 rounded-2xl bg-white/7 p-5"><h2 className="text-xl font-extrabold">Настройки и публикация</h2><p className="mt-1 text-sm text-white/55">Проверка состояния без изменения настроек владельца.</p><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><span className="text-white/50">Каталог</span><b className="mt-1 block">{tenant.catalog_published?"Опубликован":"Закрыт"}</b></div><div><span className="text-white/50">Доставка / самовывоз</span><b className="mt-1 block">{settings?.delivery_enabled?"Вкл.":"Выкл."} / {settings?.pickup_enabled?"Вкл.":"Выкл."}</b></div><div><span className="text-white/50">Онлайн-оплата</span><b className="mt-1 block">{settings?.payment_online?`Вкл. · ${settings.payment_provider??"провайдер не указан"}`:"Выкл."}</b></div><div><span className="text-white/50">Лояльность / истории</span><b className="mt-1 block">{loyaltyResult.data?.enabled?loyaltyResult.data.name:"Выкл."} / {(storiesResult.data??[]).filter(item=>item.status==="published").length} опубликовано</b></div></div><div className="mt-4 text-sm text-white/60">Зоны доставки: {(zonesResult.data??[]).filter(zone=>zone.is_active).map(zone=>`${zone.name} (${zone.provider}${zone.provider==="own"?`, ${money(zone.cost)}`:""})`).join(" · ")||"нет активных"}</div></section>
        <div className="mt-8 grid gap-7 xl:grid-cols-[1fr_330px]">
          <section className="overflow-hidden rounded-2xl bg-white text-[var(--ink)]">
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-xl font-extrabold">Каталог магазина</h2>
                <p className="mt-1 text-sm text-[var(--ink-60)]">
                  Редактирование карточки и её видимости на витрине.
                </p>
              </div>
              <Package />
            </div>
            <div className="divide-y">
              {products.map((product) => (
                <form
                  action={updateRootProduct}
                  key={product.id}
                  className="grid gap-4 p-6 lg:grid-cols-[1fr_190px]"
                >
                  <input type="hidden" name="tenantId" value={tenant.id} />
                  <input type="hidden" name="productId" value={product.id} />
                  <div className="grid gap-3">
                    <label className="text-xs font-bold">
                      Название
                      <input
                        name="title"
                        required
                        minLength={2}
                        maxLength={160}
                        defaultValue={product.title}
                        className="input mt-1"
                      />
                    </label>
                    <label className="text-xs font-bold">
                      Описание
                      <textarea
                        name="description"
                        maxLength={5000}
                        defaultValue={product.description ?? ""}
                        rows={3}
                        className="input mt-1 h-auto resize-y"
                      />
                    </label>
                    <label className="text-xs font-bold">
                      Причина изменения
                      <input
                        name="reason"
                        required
                        minLength={3}
                        maxLength={1000}
                        className="input mt-1"
                        placeholder="Например: исправление цены по заявке владельца"
                      />
                    </label>
                  </div>
                  <div className="grid content-start gap-3">
                    <label className="text-xs font-bold">
                      Цена, ₸
                      <input
                        name="price"
                        type="number"
                        min={0}
                        step={1}
                        required
                        defaultValue={product.price}
                        className="input mt-1"
                      />
                    </label>
                    <label className="text-xs font-bold">
                      Старая цена, ₸
                      <input
                        name="oldPrice"
                        type="number"
                        min={0}
                        step={1}
                        defaultValue={product.old_price ?? ""}
                        className="input mt-1"
                      />
                    </label>
                    <label className="text-xs font-bold">
                      Публикация
                      <select
                        name="isActive"
                        defaultValue={String(product.is_active)}
                        className="input mt-1"
                      >
                        <option value="true">Виден покупателям</option>
                        <option value="false">Скрыт, можно восстановить</option>
                      </select>
                    </label>
                    <button className="btn bg-[var(--accent-dark)] text-white">
                      Сохранить с аудитом
                    </button>
                  </div>
                </form>
              ))}
              {!products.length && (
                <div className="p-12 text-center text-[var(--ink-60)]">
                  <Package className="mx-auto mb-3" />
                  <b className="text-[var(--ink)]">Товаров пока нет</b>
                  <p className="mt-1 text-sm">
                    Добавление товара остаётся в кабинете владельца, чтобы
                    начальные остатки прошли через штатный журнал склада.
                  </p>
                </div>
              )}
            </div>
          </section>
          <aside className="space-y-6">
            <section className="rounded-2xl bg-white/7 p-5">
              <h2 className="font-extrabold">SMS от имени магазина</h2>
              {sms?.sender_id ? <>
                <p className="mt-3 text-sm text-white/65">Имя: <b className="text-white">{sms.sender_id}</b></p>
                <p className="mt-1 text-sm text-white/65">Статус: <b className="text-white">{sms.sender_status}</b></p>
                <form action={reviewSmsSender} className="mt-4 grid gap-3">
                  <input type="hidden" name="tenantId" value={tenant.id}/>
                  <select name="status" defaultValue={sms.sender_status} className="input text-black">
                    <option value="pending">На модерации</option>
                    <option value="approved">Одобрено</option>
                    <option value="rejected">Отклонено</option>
                  </select>
                  <input name="reason" required minLength={3} maxLength={1000} className="input text-black" placeholder="Причина решения"/>
                  <button className="btn bg-[var(--accent)] text-white">Сохранить статус</button>
                </form>
              </> : <p className="mt-3 text-sm text-white/45">Владелец ещё не указал Sender ID.</p>}
            </section>
            <section className="rounded-2xl bg-white/7 p-5">
              <div className="flex items-center gap-2">
                <ReceiptText className="text-[var(--accent-bright)]" />
                <h2 className="font-extrabold">Разделы</h2>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-white/65">
                {categories.map((category) => (
                  <li key={category.id}>{category.name}</li>
                ))}
              </ul>
              {!categories.length && (
                <p className="mt-4 text-sm text-white/45">Разделов пока нет.</p>
              )}
            </section>
            <section className="rounded-2xl bg-white/7 p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-[var(--accent-bright)]" />
                <h2 className="font-extrabold">Последние действия</h2>
              </div>
              <ul className="mt-4 space-y-4">
                {events.map((event) => (
                  <li
                    key={event.id}
                    className="border-t border-white/10 pt-3 text-sm"
                  >
                    <b className="block">{event.action}</b>
                    {event.reason && (
                      <span className="mt-1 block text-white/55">
                        {event.reason}
                      </span>
                    )}
                    <time className="mt-1 block text-xs text-white/35">
                      {new Date(event.created_at).toLocaleString("ru-KZ", {
                        timeZone: "Asia/Almaty",
                      })}
                    </time>
                  </li>
                ))}
              </ul>
              {!events.length && (
                <p className="mt-4 text-sm text-white/45">Событий пока нет.</p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
