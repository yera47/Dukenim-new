import Link from "next/link";
import { DukenimLogo } from "@/components/dukenim-logo";

export const metadata = {
  title: "Поддержка Dukenim",
  description: "Помощь владельцам магазинов и пользователям приложения Dukenim.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return <main className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
    <header className="border-b border-[var(--line)] bg-white">
      <div className="container flex h-18 items-center justify-between">
        <Link href="/" aria-label="На главную"><DukenimLogo /></Link>
        <Link href="/login" className="btn btn-primary">Войти</Link>
      </div>
    </header>
    <div className="container max-w-3xl py-12 md:py-18">
      <p className="data-label">ПОДДЕРЖКА</p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">Поможем с Dukenim</h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--ink-60)]">Вопрос по магазину, заказу, сотрудникам или мобильному приложению можно отправить из защищённого кабинета. Там обращение будет связано с нужным магазином.</p>
      <section className="mt-9 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold">Уже есть аккаунт</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-60)]">Войдите, выберите магазин и откройте раздел «Поддержка». История сообщений сохранится в кабинете.</p>
          <Link href="/admin/requests" className="btn btn-primary mt-5">Открыть поддержку</Link>
        </article>
        <article className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold">Проблема со входом</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-60)]">На странице входа можно восстановить пароль. Используйте email, с которым регистрировали магазин.</p>
          <Link href="/login" className="btn btn-secondary mt-5">Перейти ко входу</Link>
        </article>
      </section>
      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-6">
        <h2 className="text-xl font-extrabold">Перед обращением</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--ink-60)]">
          <li>укажите название магазина и экран, на котором возникла проблема;</li>
          <li>не отправляйте пароль, банковские данные, API-ключи или коды подтверждения;</li>
          <li>для заказа укажите его номер без данных банковской карты.</li>
        </ul>
      </section>
      <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold">
        <Link href="/legal/privacy" className="underline">Политика конфиденциальности</Link>
        <Link href="/legal/offer" className="underline">Условия использования</Link>
      </div>
    </div>
  </main>;
}
