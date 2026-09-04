"use client";

import { useState } from "react";
import { ArrowRight, Check, ChevronLeft, LoaderCircle, PackagePlus, Store } from "lucide-react";
import { planAnnualPrice, planAnnualSaving, planFeatures, planName, planPrice, publicPlans, type Plan } from "@/lib/plans";
import type { BusinessVertical } from "@/types/database";

type Billing = "month" | "year";
const verticals: Array<{ id: BusinessVertical; label: string }> = [{ id: "fashion", label: "Одежда и обувь" }, { id: "beauty", label: "Красота и косметика" }, { id: "food", label: "Еда и напитки" }, { id: "flowers", label: "Цветы и подарки" }, { id: "services", label: "Услуги" }, { id: "home", label: "Дом и интерьер" }, { id: "other", label: "Другое" }];

function money(value: number) {
  return new Intl.NumberFormat("ru-KZ").format(value);
}

export function OnboardingFlow({ tenant }: { tenant: { name: string; slug: string; trial_ends_at: string; next_plan: Plan } }) {
  const [step, setStep] = useState(1);
  const [vertical, setVertical] = useState<BusinessVertical | null>(null);
  const [plan, setPlan] = useState<Plan>(tenant.next_plan === "pro" ? "standard" : tenant.next_plan);
  const [billing, setBilling] = useState<Billing>("month");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trialDate = new Date(tenant.trial_ends_at).toLocaleDateString("ru-KZ", { day: "numeric", month: "long" });

  async function finish() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, businessVertical: vertical, storefrontFormat: "catalog" }),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Не удалось сохранить выбор тарифа.");
      setPending(false);
      return;
    }
    // AI Studio is the owner's first workspace; catalog creation is its first guided action.
    location.href = "/admin/ai-studio";
  }

  return <main className="onboarding-builder min-h-screen bg-[var(--surface)]">
    <header className="border-b border-[var(--line)] bg-[var(--surface)]">
      <div className="container flex h-20 items-center gap-4">
        <span className="tumar-mark"><Store size={18} /></span><b className="text-xl">Dukenim</b>
        <div className="ml-auto hidden text-right sm:block">
          <span className="data-label">БЕСПЛАТНО ДО {trialDate.toUpperCase()}</span>
          <div className="mt-1 flex gap-1">{[1, 2, 3].map((item) => <span key={item} className={`h-1.5 w-10 ${item <= step ? "bg-[var(--accent)]" : "bg-[var(--line)]"}`} />)}</div>
        </div>
      </div>
    </header>
    <div className="container max-w-6xl py-10 md:py-14">
      {step === 1 && <section className="builder-step onboarding-welcome">
        <p className="data-label">ШАГ 1 ИЗ 3</p>
        <h1>Сначала настроим AI Studio под ваш бизнес.</h1>
        <p className="onboarding-lead">Первые 7 дней — полный доступ без карты. До оплаты вы сможете спокойно собрать каталог, проверить витрину и изменить тариф.</p>
        <div className="builder-niche-grid mt-8">{verticals.map((item) => <button type="button" key={item.id} onClick={() => setVertical(item.id)} className={vertical === item.id ? "is-selected" : ""}><span>{item.label}</span></button>)}</div>
        <div className="onboarding-address"><span>Адрес вашей витрины</span><b>dukenim.kz/s/{tenant.slug}</b></div>
        <div className="onboarding-benefits">
          {[
            "Каталог, заказы и CRM синхронизированы",
            "Любое изменение можно сделать позже",
            "Деньги не спишутся автоматически",
          ].map((item) => <p key={item}><Check size={18} />{item}</p>)}
        </div>
        <div className="builder-actions"><span>Выбор бизнеса влияет на подсказки и структуру каталога.</span><button disabled={!vertical} onClick={() => setStep(2)} className="btn btn-primary">Продолжить <ArrowRight size={18} /></button></div>
      </section>}

      {step === 2 && <section className="builder-step">
        <div className="builder-intro">
          <p>ШАГ 2 ИЗ 3</p><h1>Выберите возможности магазина.</h1>
          <span>Сначала — прозрачная цена и набор функций. Визуальный стиль, шаблон и палитру вы настроите в кабинете, когда появится первый товар.</span>
        </div>
        <div className="builder-billing mt-7"><button type="button" className={billing === "month" ? "is-active" : ""} onClick={() => setBilling("month")}>Помесячно</button><button type="button" className={billing === "year" ? "is-active" : ""} onClick={() => setBilling("year")}>За год</button></div>
        <div className="onboarding-plan-grid">
          {publicPlans.map((item) => {
            const annual = billing === "year";
            const amount = annual ? planAnnualPrice[item] : planPrice[item];
            return <button type="button" key={item} onClick={() => setPlan(item)} className={`onboarding-plan-card ${plan === item ? "is-selected" : ""}`}>
              <div className="flex items-start justify-between gap-4"><div><p className="data-label">ТАРИФ</p><h2>{planName[item]}</h2></div>{plan === item && <span className="onboarding-selected"><Check size={16} /> Выбран</span>}</div>
              <strong>{money(amount)} ₸<small>{annual ? "за год" : "в месяц"}</small></strong>
              {annual && <em>Экономия {money(planAnnualSaving[item])} ₸</em>}
              <ul>{planFeatures[item].map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
            </button>;
          })}
        </div>
        <p className="onboarding-note">Тариф начнёт действовать после пробного периода. В первые 7 дней доступен весь функционал.</p>
        <div className="builder-actions"><button onClick={() => setStep(1)} className="btn btn-secondary"><ChevronLeft size={18} />Назад</button><button onClick={() => setStep(3)} className="btn btn-primary">Продолжить <ArrowRight size={18} /></button></div>
      </section>}

      {step === 3 && <section className="builder-step onboarding-finish">
        <p className="data-label">ШАГ 3 ИЗ 3</p><h1>Начнём с первого товара.</h1>
        <p className="onboarding-lead">После входа кабинет покажет короткий маршрут запуска. Сначала добавьте товар и фото; затем откроются настройка витрины, акции и аналитика.</p>
        <div className="onboarding-steps">
          <div><span>01</span><PackagePlus size={23} /><b>Первый товар</b><p>Название, цена, остаток и фотографии.</p></div>
          <div><span>02</span><Store size={23} /><b>Витрина</b><p>Шаблон и палитра после появления каталога.</p></div>
          <div><span>03</span><Check size={23} /><b>Публикация</b><p>Проверьте каталог и поделитесь ссылкой.</p></div>
        </div>
        {error && <p role="alert" className="mt-5 text-[var(--danger)]">{error}</p>}
        <div className="builder-actions"><button onClick={() => setStep(2)} className="btn btn-secondary"><ChevronLeft size={18} />Назад</button><button disabled={pending} onClick={finish} className="btn btn-cta">{pending ? <><LoaderCircle className="animate-spin" />Сохраняем…</> : <>Открыть кабинет <ArrowRight size={18} /></>}</button></div>
      </section>}
    </div>
  </main>;
}
