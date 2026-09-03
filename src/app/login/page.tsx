import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Вход в кабинет",
  description: "Войдите в кабинет владельца магазина Dukenim или в центр управления платформой.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return <main className="grid min-h-screen bg-[var(--surface)] lg:grid-cols-[1.06fr_.94fr]">
    <section className="panel-dark relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
      <div className="tumar-field absolute inset-0 opacity-40" />
      <Link href="/" className="relative flex items-center gap-3 text-xl font-extrabold"><span className="tumar-mark" /> Dukenim</Link>
      <div className="relative max-w-xl">
        <div className="data-label text-white/50">ЕДИНАЯ СИСТЕМА ТОРГОВЛИ</div>
        <h1 className="mt-4 text-6xl font-extrabold leading-[.98]">Магазин работает.<br/><span className="text-[var(--accent-bright)]">Вы всё видите.</span></h1>
        <div className="mt-10 border-y border-white/12">{["Заказы и продажи в одном потоке", "Точные остатки без ручной сверки", "Решения на основе понятных данных"].map((item) => <div key={item} className="flex items-center gap-4 border-b border-white/12 py-4 last:border-0"><Check size={18} className="text-[var(--accent-bright)]"/><b>{item}</b></div>)}</div>
      </div>
      <small className="relative text-white/42">dukenim.kz · Сделано для предпринимателей Казахстана</small>
    </section>
    <section className="grid place-items-center p-6 md:p-12"><div className="w-full max-w-[430px]">
      <Link href="/" className="mb-12 flex items-center gap-2 text-sm font-bold text-[var(--ink-60)]"><ArrowLeft size={16}/> На главную</Link>
      <div className="data-label">ЗАЩИЩЁННЫЙ ВХОД</div><h2 className="mt-3 text-4xl font-extrabold">Добро пожаловать</h2>
      <p className="mt-3 leading-7 text-[var(--ink-60)]">Войдите в кабинет владельца магазина или в центр управления платформой.</p>
      <LoginForm/>
      <p className="mt-7 text-center text-sm text-[var(--ink-60)]">Ещё нет аккаунта? <Link href="/register" className="font-extrabold text-[var(--accent)]">Начать бесплатно →</Link></p>
    </div></section>
  </main>;
}
