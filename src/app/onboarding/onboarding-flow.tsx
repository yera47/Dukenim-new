"use client";

import { useState } from "react";
import { ArrowRight, Check, ChevronLeft, LoaderCircle, PackagePlus, Store } from "lucide-react";
import { planAnnualPrice, planAnnualSaving, planFeatures, planName, planPrice, publicPlans, type Plan } from "@/lib/plans";
import type { BusinessVertical } from "@/types/database";

type Billing = "month" | "year";
type StorefrontFormat = "catalog" | "one_page";

const verticals: Array<{ id: BusinessVertical; label: string }> = [
  { id: "fashion", label: "Одежда и обувь" },
  { id: "beauty", label: "Красота и косметика" },
  { id: "food", label: "Еда и напитки" },
  { id: "flowers", label: "Цветы и подарки" },
  { id: "services", label: "Услуги" },
  { id: "event", label: "Разовое событие / акция" },
  { id: "home", label: "Дом и интерьер" },
  { id: "other", label: "Другое" },
];

function money(value: number) {
  return new Intl.NumberFormat("ru-KZ").format(value);
}

export function OnboardingFlow({ tenant }: { tenant: { name: string; slug: string; trial_ends_at: string; next_plan: Plan } }) {
  const [step, setStep] = useState(1);
  const [vertical, setVertical] = useState<BusinessVertical | null>(null);
  const [format, setFormat] = useState<StorefrontFormat>("catalog");
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
      body: JSON.stringify({ plan, businessVertical: vertical, storefrontFormat: format }),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Не удалось сохранить выбор тарифа.");
      setPending(false);
      return;
    }
    location.href = "/admin";
  }

  return <main className="onboarding-builder min-h-screen bg-[var(--surface)]">
    <header className="border-b border-[var(--line)] bg-[var(--surface)]">
      <div className="container flex h-20 items-center gap-4">
        <span className="tumar-mark"><Store size={18} /></span><b className="text-xl">Dukenim</b>
        <div className="ml-auto hidden text-right sm:block">
          <span className="data-label">БЕСПЛАТНО ДО {trialDate.toUpperCase()}</span>
          <div className="mt-1 flex gap-1">{[1, 2, 3, 4].map((item) => <span key={item} className={`h-1.5 w-10 ${item <= step ? "bg-[var(--accent)]" : "bg-[var(--line)]"}`} />)}</div>
        </div>
      </div>
    </header>
    <div className="container max-w-6xl py-10 md:py-14">
      {step === 1 && <section className="builder-step onboarding-welcome">
        <p className="data-label">ШАГ 1 ИЗ 4</p>
        <h1>Расскажите о бизнесе — так AI Studio и шаблоны подберутся точнее.</h1>
        <p className="onboarding-lead">Это не привязано к тарифу: и структуру каталога, и рекламные баннеры AI Studio предложит в любом тарифе.</p>
        <div className="builder-niche-grid mt-8">
          {verticals.map((item) => <button type="button" key={item.id} onClick={() => setVertical(item.id)} className={vertical === item.id ? "is-selected" : ""}><span>{item.label}</span></button>)}
        </div>
        <fieldset className="mt-8">
          <legend className="text-sm font-extrabold">Что нужно собрать?</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 max-w-md">
            <button type="button" onClick={() => setFormat("catalog")} className={`rounded-xl border p-3 text-left text-sm ${format === "catalog" ? "border-[var(--accent)] bg-[var(--accent-soft)] font-extrabold" : "border-[var(--line)]"}`}>Каталог магазина<br /><span className="text-xs font-medium opacity-65">Постоянный ассортимент и заказы</span></button>
            <button type="button" onClick={() => setFormat("one_page")} className={`rounded-xl border p-3 text-left text-sm ${format === "one_page" ? "border-[var(--accent)] bg-[var(--accent-soft)] font-extrabold" : "border-[var(--line)]"}`}>Одностраничник<br /><span className="text-xs font-medium opacity-65">Под конкретное событие или акцию</span></button>
          </div>
        </fieldset>
        <div className="builder-actions"><span>Следующий шаг — как будет работать магазин.</span><button onClick={() => setStep(2)} disabled={!vertical} className="btn btn-primary">Продолжить <ArrowRight size={18} /></button></div>
      </section>}

      {step === 2 && <section className="builder-step onboarding-welcome">
        <p className="data-label">ШАГ 2 ИЗ 4</p>
        <h1>Магазин создан. Теперь выберите, как он будет работать.</h1>
        <p className="onboarding-lead">Первые 7 дней — полный доступ без карты. До оплаты вы сможете спокойно собрать каталог, проверить витрину и изменить тариф.</p>
        <div className="onboarding-address"><span>Адрес вашей витрины</span><b>dukenim.kz/s/{tenant.slug}</b></div>
        <div className="onboarding-benefits">
          {[
            "Каталог, заказы и CRM синхронизированы",
            "Любое изменение можно сделать позже",
            "Деньги не спишутся автоматически",
          ].map((item) => <p key={item}><Check size={18} />{item}</p>)}
        </div>
        <div className="builder-actions"><button onClick={() => setStep(1)} className="btn btn-secondary"><ChevronLeft size={18} />Назад</button><button onClick={() => setStep(3)} className="btn btn-primary">Посмотреть тарифы <ArrowRight size={18} /></button></div>
      </section>}

      {step === 3 && <section className="builder-step">
        <div className="builder-intro">
          <p>ШАГ 3 ИЗ 4</p><h1>Выберите возможности магазина.</h1>
          <span>AI Studio и структура каталога доступны в обоих тарифах. «Бренд» добавляет точную палитру, свой домен, кампании и больше токенов AI Studio в месяц.</span>
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
        <div className="builder-actions"><button onClick={() => setStep(2)} className="btn btn-secondary"><ChevronLeft size={18} />Назад</button><button onClick={() => setStep(4)} className="btn btn-primary">Продолжить <ArrowRight size={18} /></button></div>
      </section>}

      {step === 4 && <section className="builder-step onboarding-finish">
        <p className="data-label">ШАГ 4 ИЗ 4</p><h1>Начнём с первого товара.</h1>
        <p className="onboarding-lead">После входа кабинет покажет короткий маршрут запуска. Сначала добавьте товар и фото; затем откроются настройка витрины, акции и AI Studio.</p>
        <div className="onboarding-steps">
          <div><span>01</span><PackagePlus size={23} /><b>Первый товар</b><p>Название, цена, остаток и фотографии.</p></div>
          <div><span>02</span><Store size={23} /><b>Витрина</b><p>Шаблон и палитра после появления каталога.</p></div>
          <div><span>03</span><Check size={23} /><b>Публикация</b><p>Проверьте каталог и поделитесь ссылкой.</p></div>
        </div>
        {error && <p role="alert" className="mt-5 text-[var(--danger)]">{error}</p>}
        <div className="builder-actions"><button onClick={() => setStep(3)} className="btn btn-secondary"><ChevronLeft size={18} />Назад</button><button disabled={pending} onClick={finish} className="btn btn-cta">{pending ? <><LoaderCircle className="animate-spin" />Сохраняем…</> : <>Открыть кабинет <ArrowRight size={18} /></>}</button></div>
      </section>}
    </div>
  </main>;
}
