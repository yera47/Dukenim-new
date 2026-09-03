"use client";

import Link from "next/link";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [message, setMessage] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (password.length < 8) return setMessage("Пароль должен содержать минимум 8 символов."); if (password !== confirmation) return setMessage("Пароли не совпадают."); setPending(true); setMessage(""); const { error } = await createClient().auth.updateUser({ password }); setPending(false); setMessage(error ? "Не удалось обновить пароль. Откройте новую ссылку из письма и попробуйте ещё раз." : "Пароль обновлён. Теперь можно войти в кабинет."); }
  return <main className="grid min-h-screen place-items-center bg-[var(--surface)] p-6"><section className="card w-full max-w-[450px] p-7"><ShieldCheck className="text-[var(--accent)]"/><h1 className="mt-5 text-3xl font-extrabold">Новый пароль</h1><p className="mt-3 leading-7 text-[var(--ink-60)]">Придумайте новый пароль для входа в Dukenim.</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-extrabold">Новый пароль<input value={password} onChange={event=>setPassword(event.target.value)} type="password" required minLength={8} autoComplete="new-password" className="input mt-2"/></label><label className="block text-sm font-extrabold">Повторите пароль<input value={confirmation} onChange={event=>setConfirmation(event.target.value)} type="password" required minLength={8} autoComplete="new-password" className="input mt-2"/></label><button disabled={pending} className="btn btn-primary w-full disabled:opacity-60">{pending?"Сохраняем…":"Сохранить пароль"}</button></form>{message&&<p role="status" className="mt-4 rounded-xl bg-[var(--accent-soft)] p-4 text-sm">{message}</p>}{message.startsWith("Пароль обновлён")&&<Link href="/login" className="mt-4 block text-center text-sm font-bold text-[var(--accent)]">Перейти ко входу →</Link>}</section></main>;
}
