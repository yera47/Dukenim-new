"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, MapPin, Store, Truck } from "lucide-react";
import { money } from "@/lib/demo-data";
import { useCart } from "@/components/store/cart-provider";
import { submitCheckout } from "@/lib/checkout-submit";

export type CheckoutZone = { id: string; name: string; cost: number; freeFrom: number | null; etaText: string | null };
type Result = { orderNumber: number; total: number };
type Props = { slug: string; deliveryEnabled: boolean; pickupEnabled: boolean; minOrder: number; zones: CheckoutZone[]; demo?: boolean };

export function CheckoutClient({ slug, deliveryEnabled, pickupEnabled, minOrder, zones, demo = false }: Props) {
  const { items, total, clear } = useCart();
  const firstMethod = deliveryEnabled ? "courier" : "pickup";
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [delivery, setDelivery] = useState<"courier" | "pickup">(firstMethod);
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const zone = useMemo(() => zones.find((item) => item.id === zoneId) ?? null, [zoneId, zones]);
  const deliveryCost = delivery === "courier" && zone ? (zone.freeFrom !== null && total >= zone.freeFrom ? 0 : zone.cost) : 0;
  const methodsAvailable = deliveryEnabled || pickupEnabled;
  const contactsReady = name.trim().length >= 2 && phone.replace(/\D/g, "").length >= 7;
  const deliveryReady = delivery === "pickup" ? pickupEnabled : deliveryEnabled && Boolean(zoneId) && address.trim().length >= 4;

  async function submit() {
    if (pending || !contactsReady || !deliveryReady || !items.length || total < minOrder) return;
    setPending(true);
    setError(null);
    if (demo) {
      setResult({ orderNumber: 1043, total: total + deliveryCost });
      setPending(false);
      clear();
      return;
    }
    try {
      const data = await submitCheckout({ slug, name, phone, deliveryMethod: delivery, deliveryAddress: delivery === "courier" ? address : "", zoneId: delivery === "courier" ? zoneId : null, paymentMethod: "cash", items: items.map((item) => ({ variantId: item.variantId, qty: item.qty })) });
      clear();
      setResult(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось оформить заказ. Корзина сохранена.");
    } finally { setPending(false); }
  }

  if (result) return <main className="container grid min-h-[70vh] place-items-center py-12"><div className="card max-w-xl p-10 text-center"><CheckCircle2 className="mx-auto text-[var(--success)]" size={58}/><h1 className="mt-5 text-3xl font-semibold">Заказ №{result.orderNumber} принят</h1><p className="muted mt-3">Итог: {money(result.total)}. Магазин свяжется с вами для подтверждения.</p><Link href={`/s/${slug}`} className="btn btn-cta mt-7">Вернуться в магазин</Link></div></main>;

  if (!methodsAvailable) return <main className="container grid min-h-[70vh] place-items-center py-12"><div className="card max-w-xl p-9 text-center"><Store className="mx-auto text-[var(--accent)]" size={44}/><h1 className="mt-5 text-3xl font-semibold">Оформление временно закрыто</h1><p className="muted mt-3">Магазин ещё не настроил способы получения заказа.</p><Link href={`/s/${slug}`} className="btn btn-secondary mt-7">Вернуться в каталог</Link></div></main>;

  return <main className="container py-10">
    <Link href={`/s/${slug}/cart`} className="muted inline-flex gap-1 text-sm"><ChevronLeft size={17}/> Корзина</Link>
    <div className="mx-auto mt-8 max-w-3xl">
      <div className="mb-8 flex justify-between">{["Контакты", "Получение", "Подтверждение"].map((title, index) => <div key={title} className={`flex items-center gap-2 text-sm font-bold ${step >= index + 1 ? "text-[var(--accent)]" : "text-[var(--ink-60)]"}`}><span className="grid size-8 place-items-center rounded-full border">{index + 1}</span><span className="desktop-only">{title}</span></div>)}</div>
      <section className="card p-6 md:p-9">
        {step === 1 && <><h1 className="text-3xl font-semibold">Ваши контакты</h1><p className="muted mt-2">Регистрация не нужна — только данные для подтверждения заказа.</p><div className="mt-7 grid gap-4"><input value={name} onChange={(event) => setName(event.target.value)} className="input" maxLength={80} autoComplete="name" aria-label="Ваше имя" placeholder="Например, Серик"/><input value={phone} onChange={(event) => setPhone(event.target.value)} className="input" maxLength={30} type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 777 000 00 00"/></div>{minOrder > 0 && <p className="muted mt-4 text-sm">Минимальная сумма заказа: {money(minOrder)}</p>}</>}
        {step === 2 && <><h1 className="text-3xl font-semibold">Способ получения</h1><div className="mt-7 grid gap-3">
          {deliveryEnabled && <label className="card flex cursor-pointer gap-4 p-4"><input checked={delivery === "courier"} onChange={() => setDelivery("courier")} type="radio"/><Truck className="shrink-0"/><span><b>Доставка</b><small className="muted block">Стоимость рассчитывается по выбранной зоне</small></span></label>}
          {pickupEnabled && <label className="card flex cursor-pointer gap-4 p-4"><input checked={delivery === "pickup"} onChange={() => setDelivery("pickup")} type="radio"/><Store className="shrink-0"/><span><b>Самовывоз — бесплатно</b><small className="muted block">Адрес подтвердит магазин</small></span></label>}
          {delivery === "courier" && <><label className="text-sm font-extrabold">Зона доставки<select value={zoneId} onChange={(event) => setZoneId(event.target.value)} className="input mt-2"><option value="">Выберите зону</option>{zones.map((item) => <option key={item.id} value={item.id}>{item.name} · {money(item.cost)}</option>)}</select></label><label className="text-sm font-extrabold">Адрес<textarea value={address} onChange={(event) => setAddress(event.target.value)} maxLength={500} className="input mt-2 min-h-24 py-3" autoComplete="street-address" placeholder="Улица, дом, квартира"/></label>{zone && <div className="flex gap-3 rounded-[var(--r-card)] bg-[var(--surface-2)] p-4 text-sm"><MapPin className="shrink-0 text-[var(--accent)]" size={18}/><span><b>{zone.name}: {deliveryCost ? money(deliveryCost) : "бесплатно"}</b>{zone.freeFrom !== null && <small className="muted block">Бесплатно от {money(zone.freeFrom)}</small>}{zone.etaText && <small className="muted block">{zone.etaText}</small>}</span></div>}</>}
        </div></>}
        {step === 3 && <><h1 className="text-3xl font-semibold">Проверьте заказ</h1><div className="mt-6 space-y-3">{items.map((item) => <p key={item.variantId} className="flex justify-between gap-4 border-b py-3"><span>{item.product.title} × {item.qty}</span><b>{money(item.product.price * item.qty)}</b></p>)}<p className="flex justify-between pt-3"><span>Товары</span><b>{money(total)}</b></p><p className="flex justify-between"><span>Получение</span><b>{deliveryCost ? money(deliveryCost) : "Бесплатно"}</b></p><p className="flex justify-between border-t pt-4 text-xl font-bold"><span>Итого</span><span>{money(total + deliveryCost)}</span></p></div><div className="mt-6 rounded-[var(--r-card)] border border-[var(--line)] p-4"><b>Оплата при получении</b><small className="muted block">Наличными или Kaspi QR у продавца. Dukenim не списывает деньги онлайн.</small></div></>}
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-[var(--danger)]">{error}</p>}
        <div className="mt-8 flex justify-between"><button disabled={step === 1 || pending} onClick={() => setStep((value) => value - 1)} className="btn btn-secondary disabled:opacity-0">Назад</button>{step < 3 ? <button disabled={(step === 1 && !contactsReady) || (step === 2 && !deliveryReady)} onClick={() => setStep((value) => value + 1)} className="btn btn-cta disabled:opacity-50">Продолжить</button> : <button disabled={pending || !items.length || total < minOrder} onClick={submit} className="btn btn-cta disabled:opacity-50">{pending ? "Оформляем…" : "Подтвердить заказ"}</button>}</div>
      </section>
    </div>
  </main>;
}
