"use client";
import { useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";

export function CreditTopUpButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function buy() {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/polar/credit-topup", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.url) { setError(data.error ?? "Не удалось начать оплату."); setPending(false); return; }
      window.location.href = data.url;
    } catch {
      setError("Не удалось начать оплату. Проверьте соединение.");
      setPending(false);
    }
  }

  return <div className="mt-3">
    <button onClick={buy} disabled={pending} className="btn btn-secondary text-sm">{pending ? <LoaderCircle className="animate-spin" size={16} /> : <Sparkles size={16} />}Пополнить токены AI Studio</button>
    {error && <p role="alert" className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
  </div>;
}
