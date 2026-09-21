"use client";

import { useState } from "react";
import { ArrowRight, Check, ChevronLeft, LoaderCircle, PackagePlus, Store, Play, Images } from "lucide-react";
import { planAnnualPrice, planAnnualSaving, planFeatures, planName, planPrice, publicPlans, type Plan } from "@/lib/plans";
import type { BusinessVertical } from "@/types/database";
import { launchVerticals as verticals } from "@/lib/launch-verticals";

type Billing = "month" | "year";

function money(value: number) {
  return new Intl.NumberFormat("ru-KZ").format(value);
}

export function OnboardingFlow({ tenant, initialBilling = "month" }: { tenant: { name: string; slug: string; trial_ends_at: string; next_plan: Plan; business_vertical?: BusinessVertical | null }; initialBilling?: Billing }) {
  const [step, setStep] = useState(1);
  const [vertical, setVertical] = useState<BusinessVertical | null>(tenant.business_vertical ?? null);
  const [plan, setPlan] = useState<Plan>(tenant.next_plan === "pro" ? "standard" : tenant.next_plan);
  const [billing, setBilling] = useState<Billing>(initialBilling);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trialDate = new Date(tenant.trial_ends_at).toLocaleDateString("ru-KZ", { day: "numeric", month: "long" });

  async function finish() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, businessVertical: vertical, storefrontFormat: "catalog", billingPeriod: billing === "year" ? "annual" : "monthly" }),
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
        <h1>Соберём ваш магазин.</h1>
        <p className="onboarding-lead">Выберите сферу. Дальше соберём каталог и витрину по шагам. Первые 7 дней — бесплатно и без карты.</p>
        <div className="builder-niche-grid mt-8">{verticals.map((item) => <button type="button" key={item.id} onClick={() => setVertical(item.id)} className={vertical === item.id ? "is-selected" : ""}><span>{item.label}</span></button>)}</div>
        <p className="muted mt-4 text-sm">Сейчас — каталоги товаров и готовой еды. Запись на услуги и билеты мероприятий пока недоступны.</p>
        {vertical === "food" && <p className="mt-3 text-sm" role="status">Для еды доступны блюда, варианты и дополнения, заказы ко времени и истории с фото или видео. Склад сырья пока не учитывается.</p>}
        <div className="onboarding-address"><span>Адрес вашей витрины</span><b>dukenim.kz/s/{tenant.slug}</b></div>
        <div className="onboarding-benefits">
          {[
            "Витрина, каталог и заказы связаны",
            "Любое изменение можно сделать позже",
            "Деньги не спишутся автоматически",
          ].map((item) => <p key={item}><Check size={18} />{item}</p>)}
        </div>
        <div className="builder-actions"><span>Выбор бизнеса влияет на подсказки и структуру каталога.</span><button disabled={!vertical} onClick={() => setStep(2)} className="btn btn-primary">Продолжить <ArrowRight size={18} /></button></div>
      </section>}

      {step === 2 && <section className="builder-step">
        <div className="builder-intro">
          <p>ШАГ 2 ИЗ 3</p><h1>Выберите возможности магазина.</h1>
          <span>Выберите тариф. Затем в AI Studio вы создадите каталог и выберете оформление, после этого добавите первый товар.</span>
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
        <p className="onboarding-note">Тариф начнёт действовать после пробного периода. В первые 7 дней доступны все функции выбранного тарифа.</p>
        <div className="builder-actions"><button onClick={() => setStep(1)} className="btn btn-secondary"><ChevronLeft size={18} />Назад</button><button onClick={() => setStep(3)} className="btn btn-primary">Продолжить <ArrowRight size={18} /></button></div>
      </section>}

      {step === 3 && <section className="builder-step onboarding-finish">
        <p className="data-label">ШАГ 3 ИЗ 3</p><h1>Начнём с вашего каталога.</h1>
        <p className="onboarding-lead">После входа AI Studio покажет короткий маршрут запуска. Сначала создайте каталог и добавьте товар; затем настройте витрину и опубликуйте ссылку.</p>
        <div className="onboarding-steps">
          <div><span>01</span><Store size={23} /><b>Каталог и оформление</b><p>Название, шаблон и палитра в AI Studio.</p></div>
          <div><span>02</span><PackagePlus size={23} /><b>Первый товар</b><p>Название, цена, остаток и фотографии.</p></div>
          <div><span>03</span><Check size={23} /><b>Публикация</b><p>Проверьте каталог и поделитесь ссылкой.</p></div>
        </div>
        {vertical === "food" && <div className="mt-7 grid items-center gap-6 rounded-3xl border border-[var(--line)] bg-white p-5 sm:grid-cols-[140px_1fr] sm:p-6">
          <div className="relative mx-auto flex h-48 w-32 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#e9c49b] via-[#ad6546] to-[#312337] text-white shadow-xl" aria-hidden="true"><div className="absolute left-3 right-3 top-3 flex gap-1">{[1,2,3].map(item=><span key={item} className="h-1 flex-1 rounded-full bg-white/70"/>)}</div><Play size={38} fill="currentColor"/><span className="absolute bottom-5 left-3 right-3 text-sm font-bold">Сегодня в кафе</span></div>
          <div><span className="data-label">ЕЩЁ ОДНА ВОЗМОЖНОСТЬ</span><h2 className="mt-2 text-xl font-bold">Истории над меню</h2><p className="muted mt-2 text-sm">После создания каталога загрузите своё фото или видео, напишите заголовок и при желании добавьте кнопку на блюдо. Сначала сохраните черновик, затем опубликуйте.</p><p className="mt-4 flex items-center gap-2 text-sm font-bold text-[var(--accent)]"><Images size={18}/>Каталог → Истории кафе</p></div>
        </div>}
        {error && <p role="alert" className="mt-5 text-[var(--danger)]">{error}</p>}
        <div className="builder-actions"><button onClick={() => setStep(2)} className="btn btn-secondary"><ChevronLeft size={18} />Назад</button><button disabled={pending} onClick={finish} className="btn btn-cta">{pending ? <><LoaderCircle className="animate-spin" />Сохраняем…</> : <>Открыть кабинет <ArrowRight size={18} /></>}</button></div>
      </section>}
    </div>
  </main>;
}
