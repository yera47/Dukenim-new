"use client";

import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { planFeatures } from "@/lib/plans";

function price(value: number) { return new Intl.NumberFormat("ru-KZ").format(value); }

export function PricingSection() {
  return <section id="pricing" className="pricing-rebuild"><div className="container pricing-rebuild-shell">
    <div className="pricing-rebuild-top"><div className="pricing-rebuild-copy">
      <p className="pricing-eyebrow">Тарифы Dukenim</p>
      <h2>Один тариф. Все функции.</h2>
      <p className="pricing-lead">Каталог, AI Studio, заказы, склад, клиенты, аналитика, сотрудники, акции и интеграции доступны вместе. Первые 7 дней — бесплатно и без карты.</p>
    </div>

    <div className="pricing-rebuild-cards"><article className="pricing-rebuild-card is-brand">
      <div className="pricing-card-topline"><p>Каталог</p><span><Sparkles size={13} /> Все функции</span></div>
      <h3>Весь Dukenim для вашего бизнеса.</h3>
      <div className="pricing-rebuild-price"><strong>{price(24900)} ₸</strong><span>в месяц · первые 7 дней бесплатно</span></div>
      <ul>{planFeatures.basic.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
      <Link href="/register?plan=basic&billing=month" className="pricing-card-action">Начать бесплатно <ArrowRight size={17} /></Link>
    </article></div></div>

    <section id="integrations" className="pricing-crm-launch" aria-labelledby="crm-launch-title"><div className="pricing-crm-copy">
      <p className="pricing-eyebrow">Подключение вашей CRM</p>
      <h3 id="crm-launch-title">Продолжайте работать в привычной CRM.</h3>
      <p>Выберите Bitrix24, Kommo или МойСклад. Доступ можно добавить позже: заявка появится в кабинете Dukenim и в очереди нашей команды.</p>
      <details><summary>Как проходит подключение</summary><ol><li>Вы выбираете CRM и оставляете данные для технической проверки.</li><li>Если нужен API-ключ, добавляете его позднее в защищённом поле кабинета.</li><li>Мы проверяем возможности API и сообщаем статус до включения синхронизации.</li></ol></details>
    </div><aside className="pricing-crm-promo" aria-label="Условия подключения CRM"><p>Подключение CRM</p><div><strong>Включено</strong></div><span>Заявка и техническая проверка входят в единый тариф.</span><b>Выберите CRM → добавьте доступ позже → мы проведём проверку</b></aside></section>
    <p className="pricing-crm-safety">Не запрашиваем пароль от CRM. Подключение возможно только после технической проверки и вашего подтверждения.</p>
  </div></section>;
}
