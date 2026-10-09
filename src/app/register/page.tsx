import type { Metadata } from "next";
import Link from "next/link";
import { DukenimLogo } from "@/components/dukenim-logo";
import { Check } from "lucide-react";
import { RegisterForm } from "./register-form";
import { planName } from "@/lib/plans";
import { openGraph } from "@/lib/site";

const registerDescription = "Создайте магазин Dukenim: каталог, корзина и заказы. Пробный период не списывает деньги автоматически.";

export const metadata: Metadata = {
  title: "Создать магазин Dukenim",
  description: registerDescription,
  alternates: { canonical: "/register" },
  openGraph: openGraph({ title: "Создать магазин на Dukenim", description: registerDescription, url: "/register" }),
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ social?: string; plan?: string; billing?: string }> }) {
  const query = await searchParams;
  const socialRegistration = query.social === "1";
  const plan = "basic" as const;
  const billing = "month" as const;

  return <main className="grid min-h-screen bg-[var(--surface)] lg:grid-cols-[.9fr_1.1fr]">
    <section className="panel-dark hidden p-12 lg:flex lg:flex-col lg:justify-between">
      <Link href="/" className="flex items-center gap-3 text-xl font-extrabold"><DukenimLogo inverse/></Link>
      <div>
        <h1 className="text-6xl font-extrabold leading-[.98]">Ваш бизнес.<br/><span className="text-[var(--accent-bright)]">Понятная система.</span></h1>
        <div className="mt-10 border-y border-white/12">{["Каталог, заказы и витрина в одном месте", "Все функции в одном понятном тарифе", "7 дней бесплатно, без автоматического списания"].map(item => <div key={item} className="flex items-center gap-4 border-b border-white/12 py-4 last:border-0"><Check className="text-[var(--accent-bright)]" size={18}/><b>{item}</b></div>)}</div>
      </div>
      <small className="text-white/45">Создано в Казахстане для локального бизнеса</small>
    </section>
    <section className="grid place-items-center p-6 py-12"><div className="w-full max-w-[560px]">
      <Link href="/" className="text-sm font-bold text-[var(--ink-60)]">← На главную</Link>
      <h2 className="mt-10 text-4xl font-extrabold">{socialRegistration ? "Создайте магазин" : "Создайте аккаунт"}</h2>
      <p className="mt-3 max-w-lg leading-7 text-[var(--ink-60)]">Вы выбрали {planName[plan]} с ежемесячной оплатой. Деньги не списываются автоматически во время пробного периода.</p>
      <RegisterForm socialRegistration={socialRegistration} plan={plan} billing={billing}/>
      <p className="mt-6 text-center text-sm">Уже есть аккаунт? <Link href="/login" className="font-extrabold text-[var(--accent)]">Войти</Link></p>
    </div></section>
  </main>;
}
