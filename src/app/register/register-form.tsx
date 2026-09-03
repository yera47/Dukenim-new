"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { register, type RegisterState } from "./actions";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";

const initial: RegisterState = { error: null };

function Acceptance() {
  return <label className="flex items-start gap-3 text-sm leading-6 text-[var(--ink-60)]"><input name="accepted" type="checkbox" required className="mt-1 size-4 accent-[var(--accent)]" /><span>Я принимаю <Link className="font-bold text-[var(--accent)]" href="/legal/offer">оферту</Link> и <Link className="font-bold text-[var(--accent)]" href="/legal/privacy">политику конфиденциальности</Link>.</span></label>;
}

export function RegisterForm({ socialRegistration = false }: { socialRegistration?: boolean }) {
  const [state, action, pending] = useActionState(register, initial);
  const [showPassword, setShowPassword] = useState(false);

  if (socialRegistration) {
    return <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="socialRegistration" value="true" />
      <p className="rounded-xl bg-[var(--accent-soft)] p-4 text-sm font-semibold text-[var(--accent-dark)]">Личность подтверждена через Google или Apple. Осталось создать пространство магазина.</p>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-extrabold">Ваше имя<input className="input mt-2" name="name" required autoComplete="name" placeholder="Айдана" /></label><label className="text-sm font-extrabold">Название бизнеса<input className="input mt-2" name="business" required placeholder="Aru Store" /></label></div>
      <Acceptance />
      {state.error && <p role="alert" className="rounded-[10px] bg-red-50 p-3 text-sm font-semibold text-[var(--danger)]">{state.error}</p>}
      <button disabled={pending} className="btn btn-primary w-full">{pending ? <><LoaderCircle className="animate-spin" size={18} />Создаём пространство…</> : <>Начать 7 дней бесплатно <ArrowRight size={18} /></>}</button>
    </form>;
  }

  return <><div className="mt-8"><SocialAuthButtons mode="register" next="/register?social=1" /></div><div className="my-6 flex items-center gap-3 text-xs font-bold text-[var(--ink-40)]"><span className="h-px flex-1 bg-[var(--line)]"/>или по email<span className="h-px flex-1 bg-[var(--line)]"/></div><form action={action} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-extrabold">Ваше имя<input className="input mt-2" name="name" required autoComplete="name" placeholder="Айдана" /></label><label className="text-sm font-extrabold">Название бизнеса<input className="input mt-2" name="business" required placeholder="Aru Store" /></label></div>
    <label className="block text-sm font-extrabold">Рабочий email<input className="input mt-2" name="email" type="email" required autoComplete="email" placeholder="name@company.kz" /></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-extrabold">Пароль<span className="relative mt-2 block"><input className="input pr-11" name="password" type={showPassword ? "text" : "password"} minLength={8} required autoComplete="new-password" placeholder="Минимум 8 символов" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-[var(--ink-60)] hover:text-[var(--accent)]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label><label className="block text-sm font-extrabold">Повторите пароль<input className="input mt-2" name="passwordConfirmation" type={showPassword ? "text" : "password"} minLength={8} required autoComplete="new-password" placeholder="Повторите пароль" /></label></div>
    <Acceptance />
    {state.error && <p role="alert" className="rounded-[10px] bg-red-50 p-3 text-sm font-semibold text-[var(--danger)]">{state.error}</p>}
    <button disabled={pending} className="btn btn-primary w-full">{pending ? <><LoaderCircle className="animate-spin" size={18} />Создаём пространство…</> : <>Начать 7 дней бесплатно <ArrowRight size={18} /></>}</button><p className="text-center text-sm text-[var(--ink-60)]">Карта не требуется · отменить можно до оплаты</p>
  </form></>;
}
