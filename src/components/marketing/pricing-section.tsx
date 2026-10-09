"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { planFeatures } from "@/lib/plans";
import { subscriptionTerms } from "@/lib/legal-policy";

function price(value: number) { return new Intl.NumberFormat("ru-KZ").format(value); }

export function PricingSection() {
  return <section id="pricing" className="pricing-rebuild"><div className="container pricing-rebuild-shell">
    <div className="pricing-rebuild-top"><div className="pricing-rebuild-copy"><p className="pricing-eyebrow">Один тариф Dukenim</p><h2>Все функции для работы магазина.</h2><p className="pricing-lead">Каталог, заказы, оформление, AI-инструменты, акции, команда, аналитика и выездные продажи — в одном плане.</p></div>
      <div className="pricing-rebuild-cards"><article className="pricing-rebuild-card is-brand"><div className="pricing-card-topline"><p>Каталог</p><span>7 дней бесплатно</span></div><h3>Полный доступ к системе магазина без разделения функций по тарифам.</h3><div className="pricing-rebuild-price"><strong>{price(24_900)} ₸</strong><span>в месяц после пробного периода</span></div><ul>{planFeatures.basic.map(feature => <li key={feature}><Check size={16}/>{feature}</li>)}</ul><Link href="/register?plan=basic" className="pricing-card-action">Попробовать бесплатно <ArrowRight size={17}/></Link></article></div>
    </div>
    <p className="pricing-crm-safety">Пробный период не списывает деньги автоматически. После подключения оплаты подписку можно отменить: {subscriptionTerms.cancellation.toLocaleLowerCase("ru-KZ")} Условия исключений — в <Link href="/legal/refund">политике отмены и возвратов</Link>.</p>
  </div></section>;
}
