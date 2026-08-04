"use client";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { login, type LoginState } from "./actions";
const initial: LoginState = { error: null };
export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);
  return <form action={action} className="mt-8 space-y-5">
    <label className="block text-sm font-extrabold">Email<input name="email" type="email" autoComplete="email" required className="input mt-2" placeholder="name@example.com"/></label>
    <label className="block text-sm font-extrabold">Пароль<input name="password" type="password" autoComplete="current-password" required className="input mt-2" placeholder="Введите пароль"/></label>
    {state.error && <p role="alert" className="rounded-[10px] bg-red-50 p-3 text-sm font-semibold text-[var(--danger)]">{state.error}</p>}
    <button disabled={pending} className="btn btn-primary w-full disabled:opacity-60">{pending ? "Проверяем…" : <>Войти в кабинет <ArrowRight size={18}/></>}</button>
  </form>;
}
