"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type SocialAuthButtonsProps = { next: string; mode: "login" | "register" };

const providers: Array<{ provider: Provider; label: string }> = [
  { provider: "google", label: "Google" },
  { provider: "apple", label: "Apple" },
];

export function SocialAuthButtons({ next, mode }: SocialAuthButtonsProps) {
  const [pending, setPending] = useState<Provider | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function signIn(provider: Provider) {
    setMessage(null);
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setMessage("Социальный вход временно недоступен: соединение с безопасным входом ещё не настроено.");
      return;
    }
    setPending(provider);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await createClient().auth.signInWithOAuth({ provider, options: { redirectTo } });
      if (error) {
        setMessage("Этот способ входа пока не включён. Выберите email или обратитесь в поддержку.");
        setPending(null);
      }
    } catch {
      setMessage("Не удалось начать безопасный вход. Проверьте соединение и попробуйте ещё раз.");
      setPending(null);
    }
  }

  return <div className="space-y-3">
    <div className="grid gap-2 sm:grid-cols-2">
      {providers.map(({ provider, label }) => <button key={provider} type="button" onClick={() => signIn(provider)} disabled={Boolean(pending)} className="btn btn-secondary w-full text-sm disabled:opacity-55" aria-label={`Продолжить с ${label}`}>
        {pending === provider ? <LoaderCircle size={17} className="animate-spin" /> : <span aria-hidden="true" className="font-extrabold">{label}</span>}
        {pending === provider ? "Открываем…" : `Продолжить с ${label}`}
      </button>)}
    </div>
    <p className="text-center text-xs leading-5 text-[var(--ink-60)]">{mode === "login" ? "Войдите тем способом, которым регистрировали аккаунт." : "Сначала подтвердите личность — затем создадите магазин."}</p>
    {message && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">{message}</p>}
  </div>;
}
