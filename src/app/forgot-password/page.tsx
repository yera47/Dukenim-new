"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(""); const [state, setState] = useState<"idle" | "sent" | "error">("idle"); const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); setState("idle"); try { const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` }); if (error) throw error; setState("sent"); } catch { setState("error"); } finally { setPending(false); } }
  return <main className="grid min-h-screen place-items-center bg-[var(--surface)] p-6"><section className="w-full max-w-[450px]"><Link href="/login" className="flex items-center gap-2 text-sm font-bold text-[var(--ink-60)]"><ArrowLeft size={16}/> Вернуться ко входу</Link><div className="card mt-8 p-7"><Mail className="text-[var(--accent)]"/><h1 className="mt-5 text-3xl font-extrabold">Восстановление доступа</h1><p className="mt-3 leading-7 text-[var(--ink-60)]">Укажите рабочий email. Если аккаунт существует, мы отправим безопасную ссылку для смены пароля.</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-extrabold">Email<input value={email} onChange={event=>setEmail(event.target.value)} type="email" required autoComplete="email" className="input mt-2" placeholder="name@example.com"/></label><button disabled={pending} className="btn btn-primary w-full disabled:opacity-60">{pending?"Отправляем…":"Отправить ссылку"}</button></form>{state==="sent"&&<p role="status" className="mt-4 rounded-xl bg-[var(--accent-soft)] p-4 text-sm">Если аккаунт существует, письмо уже отправлено. Проверьте входящие и папку «Спам».</p>}{state==="error"&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-[var(--danger)]">Не удалось отправить ссылку. Попробуйте позже или обратитесь в поддержку.</p>}</div></section></main>;
}
