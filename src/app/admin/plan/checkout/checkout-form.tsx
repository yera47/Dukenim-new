"use client";
import { useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { planPrice, type Plan } from "@/lib/plans";
export function CheckoutForm({ plan, polarAvailable = false }: { plan: Plan; polarAvailable?: boolean }) {
  const [accepted, setAccepted] = useState(false); const [pending, setPending] = useState(false); const [message, setMessage] = useState("");
  const period = "monthly" as const; const [promoCode, setPromoCode] = useState("");
  const listedPrice = planPrice[plan];
  async function prepare() {
    setPending(true); setMessage("");
    try {
      if (polarAvailable) {
        const response = await fetch("/api/polar/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, billingPeriod: period }) });
        const data = await response.json();
        if (!response.ok || !data.url) { setMessage(data.error ?? "Не удалось начать оплату. Попробуйте ещё раз."); setPending(false); return; }
        window.location.href = data.url;
        return;
      }
      const response = await fetch("/api/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, billingPeriod: period, promoCode }) }); const data = await response.json(); setMessage(data.error ?? data.message ?? "Выбор сохранён.");
    } catch { setMessage("Не удалось сохранить выбор тарифа. Проверьте соединение и попробуйте ещё раз."); } finally { setPending(false); } }
  return <div className="mt-6 space-y-4"><div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4 text-sm"><b>Ежемесячная оплата</b><span className="mt-1 block opacity-70">24 900 ₸ в месяц · все функции включены</span></div>{!polarAvailable && <><div className="rounded-xl border border-[var(--line)] bg-white p-4 text-sm leading-6"><b className="block">Оплата по счёту</b><span className="text-[var(--ink-60)]">Создайте заявку. Мы зафиксируем сумму и свяжемся с вами для оплаты. Доступ включается только после подтверждения платежа.</span></div><label className="block text-sm font-extrabold">Промокод <span className="font-medium text-[var(--ink-60)]">необязательно</span><input value={promoCode} onChange={event => setPromoCode(event.target.value.toUpperCase())} maxLength={32} className="input mt-2" placeholder="Например, BRAND30" autoCapitalize="characters"/></label></>}<div className="rounded-xl bg-[var(--surface-2)] p-4 text-sm"><span className="font-medium text-[var(--ink-60)]">{polarAvailable ? "К оплате" : "Сумма заявки до промокода"}</span><b className="mt-1 block text-xl">{listedPrice.toLocaleString("ru-KZ")} ₸</b></div><label className="flex cursor-pointer gap-3 rounded-[12px] bg-[var(--surface-2)] p-4 text-sm leading-6"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 size-4 accent-[var(--accent)]"/><span>Я принимаю <a href="/legal/offer" target="_blank" className="font-bold text-[var(--accent)]">публичную оферту</a> и согласен с ежемесячной подпиской. {polarAvailable ? "Итоговую сумму провайдер покажет до оплаты." : "Заявка не списывает деньги и не включает тариф автоматически."}</span></label><button onClick={prepare} disabled={!accepted || pending} className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50">{pending ? <><LoaderCircle className="animate-spin" size={18}/> {polarAvailable ? "Открываем оплату…" : "Создаём заявку…"}</> : <><ShieldCheck size={18}/> {polarAvailable ? "Оплатить подпиской" : "Создать заявку на оплату"}</>}</button>{message && <p role="status" className="rounded-[10px] bg-[var(--accent-soft)] p-4 text-sm font-semibold">{message}</p>}</div>;
}
