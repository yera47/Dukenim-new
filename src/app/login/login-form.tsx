"use client";
import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { login, type LoginState } from "./actions";
import { hasSocialAuthProviders, SocialAuthButtons } from "@/components/auth/social-auth-buttons";
const initial: LoginState = { error: null };
export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);
  return <>{hasSocialAuthProviders && <><div className="mt-8"><SocialAuthButtons mode="login" next="/auth/continue" /></div><div className="my-6 flex items-center gap-3 text-xs font-bold text-[var(--ink-40)]"><span className="h-px flex-1 bg-[var(--line)]"/>или по email<span className="h-px flex-1 bg-[var(--line)]"/></div></>}<form action={action} className="space-y-5">
    <label className="block text-sm font-extrabold">Email<input name="email" type="email" autoComplete="email" required className="input mt-2" placeholder="name@example.com"/></label>
    <label className="block text-sm font-extrabold">Пароль<input name="password" type="password" autoComplete="current-password" required className="input mt-2" placeholder="Введите пароль"/></label>
    {state.error && <p role="alert" className="rounded-[10px] bg-red-50 p-3 text-sm font-semibold text-[var(--danger)]">{state.error}</p>}
    <button disabled={pending} className="btn btn-primary w-full disabled:opacity-60">{pending ? "Проверяем…" : <>Войти в кабинет <ArrowRight size={18}/></>}</button>
    <Link href="/forgot-password" className="block text-center text-sm font-bold text-[var(--accent)]">Не помните пароль?</Link>
  </form></>;
}
