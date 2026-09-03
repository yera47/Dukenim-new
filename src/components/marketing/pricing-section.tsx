"use client";

import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useState } from "react";

type Billing = "month" | "year";

const plans = [
  { key: "basic", name: "Старт", summary: "Продажи без лишней переписки.", monthly: 24900, yearly: 239000, saving: 59800, features: ["Каталог, корзина и заказы", "CRM Dukenim, склад и сотрудники", "Товары и фотографии без лимита", "Готовые палитры и шаблоны", "Адрес slug.dukenim.kz"] },
  { key: "standard", name: "Бренд", summary: "Ваш бренд. Умная система продаж.", monthly: 34900, yearly: 335000, saving: 83800, features: ["Всё из тарифа «Старт»", "Собственный домен и точная палитра", "Акции, кампании и редактор блоков", "AI Studio: черновики витрины", "Расширенная аналитика"] },
] as const;

function price(value: number) { return new Intl.NumberFormat("ru-KZ").format(value); }

export function PricingSection() {
  // Monthly is the lowest-friction first choice; the annual saving stays visible beside it.
  const [billing, setBilling] = useState<Billing>("month");

  return <section id="pricing" className="pricing-rebuild"><div className="container pricing-rebuild-shell">
    <div className="pricing-rebuild-top"><div className="pricing-rebuild-copy">
      <p className="pricing-eyebrow">Тарифы Dukenim</p>
      <h2>Начните с продаж. Растите с брендом.</h2>
      <p className="pricing-lead">Обе подписки включают 7 дней полного доступа без карты. Выбирайте период, а не скрытые условия.</p>
      <div className="pricing-billing-switch" role="group" aria-label="Период оплаты">
        <button type="button" className={billing === "month" ? "is-active" : ""} aria-pressed={billing === "month"} onClick={() => setBilling("month")}>Ежемесячно</button>
        <button type="button" className={billing === "year" ? "is-active" : ""} aria-pressed={billing === "year"} onClick={() => setBilling("year")}>За год · выгоднее</button>
      </div>
      <p className="pricing-saving-note">За год — примерно два месяца в подарок. Экономия показана в тенге до выбора тарифа.</p>
    </div>

    <div className="pricing-rebuild-cards">{plans.map((plan) => {
      const yearly = billing === "year";
      const isBrand = plan.key === "standard";
      return <article key={plan.key} className={`pricing-rebuild-card${isBrand ? " is-brand" : ""}`}>
        <div className="pricing-card-topline"><p>{plan.name}</p>{isBrand && <span><Sparkles size={13} /> AI Studio</span>}</div>
        <h3>{plan.summary}</h3>
        <div className="pricing-rebuild-price"><strong>{price(yearly ? plan.yearly : plan.monthly)} ₸</strong><span>{yearly ? `в год · экономия ${price(plan.saving)} ₸` : "в месяц · 7 дней полного доступа"}</span></div>
        <ul>{plan.features.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
        <Link href={`/register?plan=${plan.key}&billing=${billing}`} className="pricing-card-action">Выбрать «{plan.name}» <ArrowRight size={17} /></Link>
      </article>;
    })}</div></div>

    <section id="integrations" className="pricing-crm-launch" aria-labelledby="crm-launch-title"><div className="pricing-crm-copy">
      <p className="pricing-eyebrow">Подключение вашей CRM</p>
      <h3 id="crm-launch-title">Продолжайте работать в привычной CRM.</h3>
      <p>Выберите Bitrix24, Kommo или МойСклад. Доступ можно добавить позже: заявка появится в кабинете Dukenim и в очереди нашей команды.</p>
      <details><summary>Как проходит подключение</summary><ol><li>Вы выбираете CRM и оставляете данные для технической проверки.</li><li>Если нужен API-ключ, добавляете его позднее в защищённом поле кабинета.</li><li>Мы проверяем возможности API и сообщаем статус до включения синхронизации.</li></ol></details>
    </div><aside className="pricing-crm-promo" aria-label="Условия подключения CRM на запуске"><p>Подключение CRM</p><div><del>70 000 ₸</del><strong>0 ₸</strong></div><span>На запуске — в честь открытия Dukenim</span><b>Выберите CRM → добавьте доступ позже → мы проведём проверку</b></aside></section>
    <p className="pricing-crm-safety">Не запрашиваем пароль от CRM. Подключение возможно только после технической проверки и вашего подтверждения.</p>
  </div></section>;
}
