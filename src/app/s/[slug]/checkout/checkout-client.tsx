"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, MapPin, Store, Truck } from "lucide-react";
import {rewardDiscount,type LoyaltyProgress} from "@/lib/loyalty";
import { money } from "@/lib/demo-data";
import { useCart } from "@/components/store/cart-provider";
import { submitCheckout } from "@/lib/checkout-submit";
import { PickupLocationCard } from "@/components/store/pickup-location";
import { readPickupLocation } from "@/lib/pickup-location";
import { formatCustomerDeliveryAddress, isCustomerDeliveryAddressReady, type CustomerDeliveryAddress } from "@/lib/customer-delivery-address";
import {PhoneAuth} from "@/components/store/phone-auth";
import {createClient} from "@/lib/supabase/client";
import {yandexNoticeKey} from "@/components/store/yandex-delivery-notice";

export type CheckoutZone = { id: string; name: string; cost: number; freeFrom: number | null; etaText: string | null; provider: "own" | "yandex" };
type Result = { orderNumber: number; total: number };
type Props = { slug: string; deliveryEnabled: boolean; pickupEnabled: boolean; pickupLocation?: unknown; minOrder: number; zones: CheckoutZone[]; demo?: boolean };

function localDateTimeInput(date:Date){
  const local=new Date(date.getTime()-date.getTimezoneOffset()*60_000);
  return local.toISOString().slice(0,16);
}

export function CheckoutClient({ slug, deliveryEnabled, pickupEnabled, pickupLocation, minOrder, zones, demo = false }: Props) {
  const router=useRouter();
  const { items, total, clear } = useCart();
  const firstMethod = deliveryEnabled ? "courier" : "pickup";
  const [step, setStep] = useState(1); const [rewards,setRewards]=useState<LoyaltyProgress[]>([]);const [selectedReward,setSelectedReward]=useState(""); const reward=rewards.find(r=>r.rule.id===selectedReward)?.available??null; const discount=rewardDiscount(reward,total);
  const [authenticated,setAuthenticated]=useState(demo);
  useEffect(()=>{if(demo)return;let active=true;void createClient().auth.getUser().then(({data})=>{if(!active||!data.user?.phone||!data.user.phone_confirmed_at)return;setAuthenticated(true);setPhone(data.user.phone);setName(String(data.user.user_metadata?.full_name??data.user.user_metadata?.name??""));});const controller=new AbortController();void fetch(`/api/buyer-history?slug=${encodeURIComponent(slug)}`,{cache:"no-store",signal:controller.signal}).then(r=>r.ok?r.json():null).then(data=>{if(data?.signedIn)setRewards(data.rules.filter((r:LoyaltyProgress)=>r.available));}).catch(()=>{});return()=>{active=false;controller.abort();};},[slug,demo]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [delivery, setDelivery] = useState<"courier" | "pickup">(firstMethod);
  const [timingMode, setTimingMode] = useState<"asap" | "scheduled">("asap");
  const [requestedFor, setRequestedFor] = useState("");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [addressFields, setAddressFields] = useState<CustomerDeliveryAddress>({ street: "", house: "", apartment: "", entrance: "", floor: "", comment: "" });
  const address = formatCustomerDeliveryAddress(addressFields);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [marketingConsent,setMarketingConsent]=useState(false);
  const zone = useMemo(() => zones.find((item) => item.id === zoneId) ?? null, [zoneId, zones]);
  const yandexDelivery = delivery === "courier" && zone?.provider === "yandex";
  const deliveryCost = delivery === "courier" && zone ? (zone.freeFrom !== null && total >= zone.freeFrom ? 0 : zone.cost) : 0;
  const methodsAvailable = deliveryEnabled || pickupEnabled;
  const contactsReady = (demo||authenticated) && name.trim().length >= 2 && phone.replace(/\D/g, "").length >= (demo?7:11);
  const deliveryReady = delivery === "pickup" ? pickupEnabled : deliveryEnabled && Boolean(zone) && isCustomerDeliveryAddressReady(addressFields);
  const requestedDate = requestedFor ? new Date(requestedFor) : null;
  const timingReady = timingMode === "asap" || Boolean(requestedDate && Number.isFinite(requestedDate.getTime()) && requestedDate.getTime() >= Date.now() + 15 * 60_000 && requestedDate.getTime() <= Date.now() + 14 * 86_400_000);

  useEffect(() => {
    const saved = window.sessionStorage.getItem(`dukenim:${slug}:fulfilment`);
    if (saved === "courier" && deliveryEnabled) setDelivery("courier");
    if (saved === "pickup" && pickupEnabled) setDelivery("pickup");
  }, [deliveryEnabled, pickupEnabled, slug]);

  async function submit() {
    if (pending || !contactsReady || !deliveryReady || !timingReady || !items.length || total < minOrder) return;
    setPending(true);
    setError(null);
    if (demo) {
      setResult({ orderNumber: 1043, total: total + deliveryCost });
      setPending(false);
      clear();
      return;
    }
    try {
      const data = await submitCheckout({ marketingConsent,yandexConsent:zone?.provider==="yandex" && window.localStorage.getItem(yandexNoticeKey(slug))==="yes",reward:reward?{ruleId:reward.ruleId,milestone:reward.milestone}:null, referralCode:window.localStorage.getItem(`dukenim:${slug}:referral`), slug, name, phone, deliveryMethod: delivery, deliveryAddress: delivery === "courier" ? address : "", zoneId: delivery === "courier" ? zoneId : null, paymentMethod: "cash", timingMode, requestedFor: timingMode === "scheduled" ? requestedDate?.toISOString() : null, items: items.map((item) => ({ variantId: item.variantId, qty: item.qty, selection:item.selection })) });
      clear();
      setResult(data);
      router.push(`/s/${slug}/orders`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось оформить заказ. Корзина сохранена.");
    } finally { setPending(false); }
  }

  if (result) return <main className="container grid min-h-[70vh] place-items-center py-12"><div className="card max-w-xl p-10 text-center"><CheckCircle2 className="mx-auto text-[var(--success)]" size={58}/><h1 className="mt-5 text-3xl font-semibold">Заказ №{result.orderNumber} принят</h1><p className="muted mt-3">{yandexDelivery?"Товары: ":"Итог: "}{money(result.total)}. {yandexDelivery?"Менеджер сообщит стоимость Яндекс Доставки отдельно.":"Магазин свяжется с вами для подтверждения."}</p><Link href={`/s/${slug}`} className="btn btn-cta mt-7">Вернуться в магазин</Link></div></main>;

  if (!methodsAvailable) return <main className="container grid min-h-[70vh] place-items-center py-12"><div className="card max-w-xl p-9 text-center"><Store className="mx-auto text-[var(--accent)]" size={44}/><h1 className="mt-5 text-3xl font-semibold">Оформление временно закрыто</h1><p className="muted mt-3">Магазин ещё не настроил способы получения заказа.</p><Link href={`/s/${slug}`} className="btn btn-secondary mt-7">Вернуться в каталог</Link></div></main>;

  return <main className="container py-10">
    <Link href={`/s/${slug}/cart`} className="muted inline-flex gap-1 text-sm"><ChevronLeft size={17}/> Корзина</Link>
    <div className="mx-auto mt-8 max-w-3xl">
      <div className="mb-8 flex justify-between">{["Контакты", "Получение", "Подтверждение"].map((title, index) => <div key={title} className={`flex items-center gap-2 text-sm font-bold ${step >= index + 1 ? "text-[var(--accent)]" : "text-[var(--ink-60)]"}`}><span className="grid size-8 place-items-center rounded-full border">{index + 1}</span><span className="desktop-only">{title}</span></div>)}</div>
      <section className="card p-6 md:p-9">
        {step === 1 && <><h1 className="text-3xl font-semibold">Ваш профиль</h1><p className="muted mt-2">{demo?"Демонстрация оформления: в реальном магазине номер подтверждается кодом из SMS.":"Подтвердите телефон один раз. К нему привяжутся история заказов и карта лояльности этого магазина."}</p>{!authenticated&&<div className="mt-6"><PhoneAuth slug={slug} onAuthenticated={user=>{setAuthenticated(true);setPhone(user.phone??"");setName(String(user.user_metadata?.full_name??user.user_metadata?.name??""));}}/></div>}<div className="mt-6 grid gap-4"><label className="text-sm font-bold">Ваше имя<input value={name} onChange={(event) => setName(event.target.value)} className="input mt-2" maxLength={80} autoComplete="name" aria-label="Ваше имя" placeholder="Например, Серик"/></label>{demo?<label className="text-sm font-bold">Телефон для демонстрации<input value={phone} onChange={event=>setPhone(event.target.value)} className="input mt-2" maxLength={30} type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 777 000 00 00"/></label>:authenticated&&<label className="text-sm font-bold">Подтверждённый телефон<input value={phone} readOnly className="input mt-2 bg-[var(--surface-2)]" maxLength={30} type="tel" autoComplete="tel"/></label>}</div>{minOrder > 0 && <p className="muted mt-4 text-sm">Минимальная сумма заказа: {money(minOrder)}</p>}</>}
        {step === 2 && <><h1 className="text-3xl font-semibold">Способ получения</h1><div className="mt-7 grid gap-3">
          {deliveryEnabled && <label className="card flex cursor-pointer gap-4 p-4"><input checked={delivery === "courier"} onChange={() => setDelivery("courier")} type="radio"/><Truck className="shrink-0"/><span><b>Доставка</b><small className="muted block">Условия зависят от выбранного способа</small></span></label>}
          {pickupEnabled && <label className="card flex cursor-pointer gap-4 p-4"><input checked={delivery === "pickup"} onChange={() => setDelivery("pickup")} type="radio"/><Store className="shrink-0"/><span><b>Самовывоз — бесплатно</b><small className="muted block">{readPickupLocation(pickupLocation)?.address ?? "Адрес подтвердит магазин"}</small></span></label>}
          {delivery === "pickup" && <PickupLocationCard value={pickupLocation}/>}
          {delivery === "courier" && <>
            <label className="text-sm font-extrabold">Зона и служба доставки<select value={zoneId} onChange={(event) => setZoneId(event.target.value)} className="input mt-2"><option value="">Выберите зону</option>{zones.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.provider==="yandex"?"Яндекс Доставка · цена после заказа":`Своя доставка · ${money(item.cost)}`}</option>)}</select></label>
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                ["street", "Город и улица", 180], ["house", "Дом / корпус", 30],
                ["apartment", "Квартира / офис · необязательно", 20], ["entrance", "Подъезд · необязательно", 20],
                ["floor", "Этаж · необязательно", 10], ["comment", "Комментарий курьеру · необязательно", 150],
              ] as const).map(([field, label, limit]) => <label key={field} className="text-sm font-semibold">{label}
                <input className="input mt-2" value={addressFields[field]} maxLength={limit} required={field === "street" || field === "house"}
                  autoComplete={field === "street" ? "address-line1" : "off"}
                  onChange={event => setAddressFields(previous => ({ ...previous, [field]: event.target.value }))}/>
              </label>)}
            </div>
            {zone && <div className="flex gap-3 rounded-[var(--r-card)] bg-[var(--surface-2)] p-4 text-sm"><MapPin className="shrink-0 text-[var(--accent)]" size={18}/><span><b>{zone.provider==="yandex"?"Яндекс Доставка":"Доставка магазина"} · {zone.name}: {zone.provider==="yandex"?"стоимость сообщит менеджер":deliveryCost?money(deliveryCost):"бесплатно"}</b>{zone.provider==="own"&&zone.freeFrom !== null && <small className="muted block">Бесплатно от {money(zone.freeFrom)}</small>}{zone.etaText && <small className="muted block">{zone.etaText}</small>}{zone.provider==="yandex"&&<small className="muted block">После заказа менеджер оформит доставку от двери до двери и сообщит цену по расстоянию. Оплата наличными при получении.</small>}</span></div>}
          </>}
          <fieldset className="mt-3 grid gap-3 border-t pt-5">
            <legend className="mb-2 font-extrabold">Когда приготовить заказ?</legend>
            <label className="card flex cursor-pointer gap-3 p-4"><input type="radio" checked={timingMode === "asap"} onChange={() => setTimingMode("asap")}/><span><b>Как можно скорее</b><small className="muted block">Магазин подтвердит время после оформления</small></span></label>
            <label className="card flex cursor-pointer gap-3 p-4"><input type="radio" checked={timingMode === "scheduled"} onChange={() => setTimingMode("scheduled")}/><span><b>Ко времени</b><small className="muted block">Например, к обеду в 13:00</small></span></label>
            {timingMode === "scheduled" && <label className="text-sm font-extrabold">Дата и время<input type="datetime-local" className="input mt-2" value={requestedFor} min={localDateTimeInput(new Date(Date.now() + 15 * 60_000))} max={localDateTimeInput(new Date(Date.now() + 14 * 86_400_000))} onChange={event => setRequestedFor(event.target.value)}/><small className="muted mt-2 block">Не раньше чем через 15 минут и не позже чем через 14 дней.</small></label>}
          </fieldset>
        </div></>}
        {step === 3 && <>
          {rewards.length>0&&<label className="mb-6 block rounded-2xl bg-[var(--accent-soft)] p-4 text-sm font-semibold">Ваша награда<select className="input mt-2" value={selectedReward} onChange={e=>setSelectedReward(e.target.value)}><option value="">Сохранить на потом</option>{rewards.map(r=><option key={r.rule.id} value={r.rule.id} disabled={total<r.rule.minOrder}>{r.rule.label}{total<r.rule.minOrder?` · заказ от ${money(r.rule.minOrder)}`:""}</option>)}</select>{reward&&<p className="mt-2 text-xs">{reward.reward==="gift"?"Подарок автоматически добавится к заказу":"Скидка: −"+money(discount)}</p>}</label>}
          <h1 className="text-3xl font-semibold">Проверьте заказ</h1>
          <div className="mt-6 space-y-3">
            {items.map((item) => <p key={item.lineId} className="flex justify-between gap-4 border-b py-3"><span>{item.product.title} × {item.qty}</span><b>{money(item.unitPrice * item.qty)}</b></p>)}
            <p className="flex justify-between pt-3"><span>Товары</span><b>{money(total)}</b></p>
            <p className="flex justify-between gap-4"><span>Получение</span><b className="text-right">{yandexDelivery?"Яндекс Доставка · цена после заказа":deliveryCost?money(deliveryCost):"Бесплатно"}</b></p>
            <p className="flex justify-between"><span>Когда</span><b>{timingMode === "scheduled" && requestedDate ? new Intl.DateTimeFormat("ru-KZ", {dateStyle:"medium",timeStyle:"short"}).format(requestedDate) : "Как можно скорее"}</b></p>
            <p className="flex justify-between border-t pt-4 text-xl font-bold"><span>{yandexDelivery?"Итого за товары":"Итого"}</span><span>{money(total + deliveryCost - discount)}</span></p>
            {yandexDelivery&&<p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-950">Доставка оплачивается отдельно: менеджер сообщит стоимость по расстоянию и согласует её с вами.</p>}
          </div>
          <div className="mt-6 rounded-[var(--r-card)] border border-[var(--line)] p-4"><b>Оплата при получении</b><small className="muted block">{yandexDelivery?"Наличными. Менеджер уточнит оплату товаров и доставки.":"Наличными или Kaspi QR у продавца. Dukenim не списывает деньги онлайн."}</small></div>
          <label className="mt-4 flex items-start gap-3 rounded-2xl bg-[var(--surface-2)] p-4 text-sm"><input className="mt-1 accent-[var(--accent)]" type="checkbox" checked={marketingConsent} onChange={event=>setMarketingConsent(event.target.checked)}/><span><b>Получать акции этого магазина по SMS</b><small className="muted mt-1 block">Необязательно. Отписаться можно в профиле или через магазин.</small></span></label>
        </>}
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-[var(--danger)]">{error}</p>}
        <div className="mt-8 flex justify-between"><button disabled={step === 1 || pending} onClick={() => setStep((value) => value - 1)} className="btn btn-secondary disabled:opacity-0">Назад</button>{step < 3 ? <button disabled={(step === 1 && !contactsReady) || (step === 2 && (!deliveryReady || !timingReady))} onClick={() => setStep((value) => value + 1)} className="btn btn-cta disabled:opacity-50">Продолжить</button> : <button disabled={pending || !items.length || total < minOrder || !timingReady} onClick={submit} className="btn btn-cta disabled:opacity-50">{pending ? "Оформляем…" : "Подтвердить заказ"}</button>}</div>
      </section>
    </div>
  </main>;
}
