import type { Metadata } from "next";
import Link from "next/link";
import { DukenimLogo } from "@/components/dukenim-logo";
import { Check } from "lucide-react";
import { RegisterForm } from "./register-form";
import { isPublicPlan, planName } from "@/lib/plans";
import { openGraph } from "@/lib/site";

const registerDescription = "Зарегистрируйтесь в Dukenim и соберите магазин: витрина, каталог и заказы. 7 дней доступа к выбранному тарифу без банковской карты.";

export const metadata: Metadata = {
  title: "Создать магазин — 7 дней бесплатно",
  description: registerDescription,
  alternates: { canonical: "/register" },
  openGraph: openGraph({ title: "Создать магазин на Dukenim — 7 дней бесплатно", description: registerDescription, url: "/register" }),
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ social?: string; plan?: string; billing?: string }> }) {
  const query = await searchParams;
  const socialRegistration = query.social === "1";
  const plan = isPublicPlan(query.plan) ? query.plan : "standard";
  const billing = query.billing === "year" || query.billing === "annual" ? "year" : "month";

  return <main className="grid min-h-screen bg-[var(--surface)] lg:grid-cols-[.9fr_1.1fr]">
    <section className="panel-dark hidden p-12 lg:flex lg:flex-col lg:justify-between">
      <Link href="/" className="flex items-center gap-3 text-xl font-extrabold"><DukenimLogo inverse/></Link>
      <div>
        <h1 className="text-6xl font-extrabold leading-[.98]">Ваш бизнес.<br/><span className="text-[var(--accent-bright)]">Собственная система.</span></h1>
        <div className="mt-10 border-y border-white/12">{["Витрина, каталог и заказы в одном месте", "7 дней выбранного тарифа без карты", "Пошаговый запуск без сложной настройки"].map((item) => <div key={item} className="flex items-center gap-4 border-b border-white/12 py-4 last:border-0"><Check className="text-[var(--accent-bright)]" size={18}/><b>{item}</b></div>)}</div>
      </div>
      <small className="text-white/45">Сделано в Казахстане для локального бизнеса</small>
    </section>
    <section className="grid place-items-center p-6 py-12"><div className="w-full max-w-[560px]">
      <Link href="/" className="text-sm font-bold text-[var(--ink-60)]">← На главную</Link>
      <h2 className="mt-10 text-4xl font-extrabold">{socialRegistration ? "Создайте магазин" : "Создайте аккаунт"}</h2>
      <p className="mt-3 max-w-lg leading-7 text-[var(--ink-60)]">Вы выбрали тариф «{planName[plan]}» {billing === "year" ? "на год" : "с помесячной оплатой"}. Изменить решение можно в следующем шаге.</p>
      <RegisterForm socialRegistration={socialRegistration} plan={plan} billing={billing}/>
      <p className="mt-6 text-center text-sm">Уже есть аккаунт? <Link href="/login" className="font-extrabold text-[var(--accent)]">Войти</Link></p>
    </div></section>
  </main>;
}
