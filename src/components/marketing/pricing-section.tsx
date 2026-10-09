"use client";

import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { planFeatures } from "@/lib/plans";
import { subscriptionTerms } from "@/lib/legal-policy";

function price(value: number) { return new Intl.NumberFormat("ru-KZ").format(value); }

export function PricingSection() {
  const plans = [
    { id: "basic", name: "Base", price: 25_000, features: planFeatures.basic, badge: "Всё для первых продаж", copy: "Готовая онлайн-витрина без AI-инструментов.", period: "в месяц" },
    { id: "standard", name: "Premium", price: 35_000, features: planFeatures.standard, badge: "Продажи + AI", copy: "Каталог и AI-фото с учётом кредитов после подключения генерации.", period: "в месяц" },
  ] as const;

  return <section id="pricing" className="pricing-rebuild"><div className="container pricing-rebuild-shell">
    <div className="pricing-rebuild-top"><div className="pricing-rebuild-copy"><p className="pricing-eyebrow">Тарифы Dukenim</p><h2>Начните продавать уже на Base.</h2><p className="pricing-lead">В каждом плане есть каталог, заказы и оформление витрины. Premium добавляет AI-инструменты.</p></div>
      <div className="pricing-rebuild-cards">{plans.map(plan => <article key={plan.id} className={`pricing-rebuild-card ${plan.id === "standard" ? "is-brand" : ""}`}><div className="pricing-card-topline"><p>{plan.name}</p><span><Sparkles size={13}/>{plan.badge}</span></div><h3>{plan.copy}</h3><div className="pricing-rebuild-price"><strong>{price(plan.price)} ₸</strong><span>{plan.period}</span></div><ul>{plan.features.map(feature => <li key={feature}><Check size={16}/>{feature}</li>)}</ul><Link href={`/register?plan=${plan.id}`} className="pricing-card-action">Попробовать бесплатно <ArrowRight size={17}/></Link></article>)}</div>
    </div>
    <p className="pricing-crm-safety">Пробный период не списывает деньги автоматически. После подключения оплаты подписку можно отменить: {subscriptionTerms.cancellation.toLocaleLowerCase("ru-KZ")} Условия исключений — в <Link href="/legal/refund">политике отмены и возвратов</Link>.</p>
  </div></section>;
}
