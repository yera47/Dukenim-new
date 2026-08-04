"use client";
import { useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import type { Plan } from "@/lib/plans";
export function CheckoutForm({ plan }: { plan: Plan }) {
  const [accepted, setAccepted] = useState(false); const [pending, setPending] = useState(false); const [message, setMessage] = useState("");
  async function pay() { setPending(true); setMessage(""); try { const response = await fetch("/api/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) }); const data = await response.json(); setMessage(data.error ?? "Переходим к оплате…"); } catch { setMessage("Не удалось связаться с платёжным сервисом"); } finally { setPending(false); } }
  return <div className="mt-6"><label className="flex cursor-pointer gap-3 rounded-[12px] bg-[var(--surface-2)] p-4 text-sm leading-6"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 size-4 accent-[var(--accent)]"/><span>Я принимаю <a href="/legal/offer" target="_blank" className="font-bold text-[var(--accent)]">публичную оферту</a> и согласен с условиями подписки. Автосписание не включается без отдельного согласия.</span></label><button onClick={pay} disabled={!accepted || pending} className="btn btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50">{pending ? <><LoaderCircle className="animate-spin" size={18}/> Подключаем…</> : <><ShieldCheck size={18}/> Перейти к безопасной оплате</>}</button>{message && <p role="status" className="mt-4 rounded-[10px] bg-[var(--accent-soft)] p-4 text-sm font-semibold">{message}</p>}</div>;
}
