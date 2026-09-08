import Link from "next/link";
import { ArrowRight, Globe, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/queries/owner";
import { openDomainSupport } from "@/app/admin/requests/thread-actions";

export default async function DomainsPage() {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  const tenant = process.env.NEXT_PUBLIC_SUPABASE_URL && tenantId ? (await getTenant(await createClient(), tenantId)).data : null;
  const address = tenant ? `https://www.dukenim.kz/s/${tenant.slug}` : null;
  return <section className="mx-auto max-w-4xl space-y-7">
    <div><p className="muted text-sm">Адрес вашего магазина</p><h1 className="mt-2 text-3xl font-bold">Ссылка и свой домен</h1><p className="muted mt-3 max-w-2xl leading-7">Для запуска не нужно покупать домен. Сначала проверьте каталог по ссылке Dukenim. Собственное имя можно подключить отдельно.</p></div>
    <article className="card p-6"><div className="flex items-center gap-3"><Globe size={21}/><h2 className="text-xl font-bold">Ссылка Dukenim</h2></div>
      {address ? <><p className="my-4 break-all">{address}</p><Link className="btn btn-primary" href={`/s/${tenant!.slug}`} target="_blank" rel="noopener noreferrer">Проверить витрину <ArrowRight size={16}/></Link><p className="muted mt-4 text-sm">Перед публикацией ссылки проверьте товары, контакты и способы получения. Ссылка работает, пока магазин доступен по условиям вашего тарифа.</p></> : <p className="muted mt-4">Точный адрес появится после входа в ваш магазин.</p>}
    </article>
    <article className="card p-6">
      <h2 className="text-xl font-bold">Хочу адрес вроде myshop.kz</h2>
      <ol className="mt-6 space-y-6">
        <li><h3 className="font-bold">1. Зарегистрируйте имя на себя</h3><p className="muted mt-2 leading-7">Выберите свободное имя у регистратора доменов. Проверьте стоимость продления, а не только первого года. Владельцем домена должны оставаться вы — не сотрудник и не подрядчик.</p></li>
        <li><h3 className="font-bold">2. Передайте имя в поддержку</h3><p className="muted mt-2 leading-7">Напишите выбранный домен и ссылку магазина. Команда проверит возможность подключения и выдаст конкретные DNS-записи. Пароль от регистратора и коды подтверждения передавать не нужно.</p></li>
        <li><h3 className="font-bold">3. Добавьте выданные DNS-записи</h3><p className="muted mt-2 leading-7">В кабинете регистратора откройте DNS-зону. Внесите только записи из инструкции поддержки. Не удаляйте MX и почтовые TXT-записи: это может отключить вашу почту.</p></li>
        <li><h3 className="font-bold">4. Дождитесь проверки адреса и HTTPS</h3><p className="muted mt-2 leading-7">Изменения DNS распространяются не мгновенно. Делитесь новым адресом только после подтверждения, что он открывает именно ваш магазин и защищён HTTPS.</p></li>
      </ol>
      <form action={openDomainSupport} className="mt-6"><button className="btn btn-primary">Помогите подключить домен <ArrowRight size={16}/></button><p className="mt-2 text-xs text-neutral-500">Отправим запрос со ссылкой вашего магазина и откроем диалог. Если обращение уже открыто, продолжим его.</p></form>
    </article>
    <aside className="rounded-2xl border border-[var(--line)] p-5"><h2 className="flex items-center gap-2 font-bold"><ShieldCheck size={18}/> Что уже проверено?</h2><p className="muted mt-3 leading-7">{tenant?.custom_domain ? `В настройках указан: ${tenant.custom_domain}. Автоматическая проверка DNS на этом экране пока не выполняется; подтвердите подключение с поддержкой.` : "Собственный домен пока не подключён. Здесь показана инструкция, а не автоматический сервис настройки DNS."}</p></aside>
  </section>;
}
