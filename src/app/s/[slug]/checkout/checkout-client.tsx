"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, CheckCircle2, ChevronLeft, MapPin, Store, Truck } from "lucide-react";
import {rewardDiscount,type LoyaltyProgress} from "@/lib/loyalty";
import { money } from "@/lib/demo-data";
import { useCart } from "@/components/store/cart-provider";
import { variantLabel } from "@/lib/cart-items";
import { submitCheckout } from "@/lib/checkout-submit";
import { PickupLocationCard } from "@/components/store/pickup-location";
import { readPickupLocation } from "@/lib/pickup-location";
import { formatCustomerDeliveryAddress, isCustomerDeliveryAddressReady, type CustomerDeliveryAddress } from "@/lib/customer-delivery-address";
import {PhoneAuth} from "@/components/store/phone-auth";
import {createClient} from "@/lib/supabase/client";
import { createCheckoutSubmissionGuard } from "@/lib/checkout-submit-guard";
import { checkoutPayloadFingerprint, clearCheckoutKey, getOrCreateCheckoutKey } from "@/lib/checkout-idempotency";

export type CheckoutZone = { id: string; name: string; cost: number; freeFrom: number | null; etaText: string | null; provider: "own" | "yandex" };
type Result = { orderNumber: number; total: number };
type Props = { slug: string; deliveryEnabled: boolean; pickupEnabled: boolean; pickupLocation?: unknown; minOrder: number; zones: CheckoutZone[]; demo?: boolean; basePath?: string; phoneAuthAvailable?: boolean; kaspiRemoteEnabled?:boolean; kaspiRemoteLinkAvailable?:boolean };

function CheckoutThumbnail({src,title}:{src?:string;title:string}){
  return <span className="relative block size-12 shrink-0 overflow-hidden rounded-xl bg-[var(--store-accent-soft)]">
    <span aria-hidden="true" className="absolute inset-0 grid place-items-center font-bold text-[var(--tenant-accent)]">{title.trim().slice(0,1)}</span>
    {src?<>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="eager" className="absolute inset-0 size-full object-cover"/>
    </>:null}
  </span>;
}

function localDateTimeInput(date:Date){
  const local=new Date(date.getTime()-date.getTimezoneOffset()*60_000);
  return local.toISOString().slice(0,16);
}
function normalizeKzPhone(value:string){
  const digits=value.replace(/\D/g,"");
  const national=digits.length===10?`7${digits}`:digits.length===11&&digits.startsWith("8")?`7${digits.slice(1)}`:digits;
  return national.length===11&&national.startsWith("7")?`+${national}`:value.trim();
}

export function CheckoutClient({ slug, deliveryEnabled, pickupEnabled, pickupLocation, minOrder, zones, demo = false, basePath, phoneAuthAvailable = false, kaspiRemoteEnabled=false, kaspiRemoteLinkAvailable=false }: Props) {
  const router=useRouter();
  const storePath=basePath??`/s/${slug}`;
  const submissionGuard=useRef(createCheckoutSubmissionGuard());
  const { items, total, clear } = useCart();
  const firstMethod = deliveryEnabled ? "courier" : "pickup";
  const [step, setStep] = useState(1); const [rewards,setRewards]=useState<LoyaltyProgress[]>([]);const [selectedReward,setSelectedReward]=useState(""); const reward=rewards.find(r=>r.rule.id===selectedReward)?.available??null; const discount=rewardDiscount(reward,total);
  const [authenticated,setAuthenticated]=useState(demo);
  useEffect(()=>{if(demo)return;let active=true;void createClient().auth.getUser().then(({data})=>{if(!active||!data.user?.phone||!data.user.phone_confirmed_at)return;setAuthenticated(true);setPhone(data.user.phone);setName(String(data.user.user_metadata?.full_name??data.user.user_metadata?.name??""));});const controller=new AbortController();void fetch(`/api/buyer-history?slug=${encodeURIComponent(slug)}`,{cache:"no-store",signal:controller.signal}).then(r=>r.ok?r.json():null).then(data=>{if(data?.signedIn)setRewards(data.rules.filter((r:LoyaltyProgress)=>r.available));}).catch(()=>{});return()=>{active=false;controller.abort();};},[slug,demo]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [delivery, setDelivery] = useState<"courier" | "pickup">(firstMethod);
  const [presetFulfilment, setPresetFulfilment] = useState(false);
  const [changingFulfilment, setChangingFulfilment] = useState(false);
  const [timingMode, setTimingMode] = useState<"asap" | "scheduled">("asap");
  const [requestedFor, setRequestedFor] = useState("");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [addressFields, setAddressFields] = useState<CustomerDeliveryAddress>({ street: "", house: "", apartment: "", entrance: "", floor: "", comment: "" });
  const address = formatCustomerDeliveryAddress(addressFields);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [marketingConsent,setMarketingConsent]=useState(false);
  // A shop that enabled remote Kaspi presents one clear payment path.
  const paymentMethod: "cash"|"kaspi" = kaspiRemoteEnabled ? "kaspi" : "cash";
  const [privacyConsent,setPrivacyConsent]=useState(false);
  const [invited,setInvited]=useState(false);
  useEffect(()=>{if(!demo)setInvited(Boolean(window.localStorage.getItem(`dukenim:${slug}:referral`)));},[demo,slug]);
  const [deliveryConsent,setDeliveryConsent]=useState(false);
  useEffect(()=>{
    const saved=window.sessionStorage.getItem(`dukenim:${slug}:fulfilment`);
    if((saved==="courier"&&deliveryEnabled)||(saved==="pickup"&&pickupEnabled)){
      setDelivery(saved);
      setPresetFulfilment(true);
    }
  },[deliveryEnabled,pickupEnabled,slug]);
  useEffect(()=>{
    if(presetFulfilment) window.sessionStorage.setItem(`dukenim:${slug}:fulfilment`,delivery);
  },[delivery,presetFulfilment,slug]);
  const zone = useMemo(() => zones.find((item) => item.id === zoneId) ?? null, [zoneId, zones]);
  const yandexDelivery = delivery === "courier" && zone?.provider === "yandex";
  const deliveryCost = delivery === "courier" && zone ? (zone.freeFrom !== null && total >= zone.freeFrom ? 0 : zone.cost) : 0;
  const methodsAvailable = deliveryEnabled || pickupEnabled;
  const guestCheckout = !demo && !authenticated && !phoneAuthAvailable;
  const contactsReady = (demo||authenticated||guestCheckout) && name.trim().length >= 2 && (guestCheckout ? /^\+7\d{10}$/.test(phone.trim()) && privacyConsent : phone.replace(/\D/g, "").length >= (demo?7:11));
  const deliveryReady = delivery === "pickup" ? pickupEnabled : deliveryEnabled && Boolean(zone) && isCustomerDeliveryAddressReady(addressFields);
  const requestedDate = requestedFor ? new Date(requestedFor) : null;
  const timingReady = timingMode === "asap" || Boolean(requestedDate && Number.isFinite(requestedDate.getTime()) && requestedDate.getTime() >= Date.now() + 15 * 60_000 && requestedDate.getTime() <= Date.now() + 14 * 86_400_000);

  useEffect(() => {
    const saved = window.sessionStorage.getItem(`dukenim:${slug}:fulfilment`);
    if (saved === "courier" && deliveryEnabled) setDelivery("courier");
    if (saved === "pickup" && pickupEnabled) setDelivery("pickup");
  }, [deliveryEnabled, pickupEnabled, slug]);
  useEffect(() => {
    if ((delivery === "courier" && deliveryEnabled) || (delivery === "pickup" && pickupEnabled)) {
      window.sessionStorage.setItem(`dukenim:${slug}:fulfilment`, delivery);
    }
  }, [delivery, deliveryEnabled, pickupEnabled, slug]);

  async function submit() {
    if (pending || !contactsReady || !deliveryReady || !timingReady || !items.length || total < minOrder || (yandexDelivery && !deliveryConsent)) return;
    if (!submissionGuard.current.acquire()) return;
    setPending(true);
    setError(null);
    try {
      if (demo) {
        setResult({ orderNumber: 0, total: total + deliveryCost });
        clear();
        return;
      }
      const payload = { marketingConsent:!guestCheckout&&marketingConsent,privacyConsent:guestCheckout?privacyConsent:true,yandexConsent:yandexDelivery&&deliveryConsent,reward:reward?{ruleId:reward.ruleId,milestone:reward.milestone}:null, referralCode:window.localStorage.getItem(`dukenim:${slug}:referral`), slug, name, phone, deliveryMethod: delivery, deliveryAddress: delivery === "courier" ? address : "", zoneId: delivery === "courier" ? zoneId : null, paymentMethod, timingMode, requestedFor: timingMode === "scheduled" ? requestedDate?.toISOString() : null, items: items.map((item) => ({ variantId: item.variantId, qty: item.qty, selection:item.selection })) };
      const idempotencyKey = getOrCreateCheckoutKey(window.sessionStorage, slug, checkoutPayloadFingerprint(payload));
      const data = await submitCheckout(payload, idempotencyKey);
      clearCheckoutKey(window.sessionStorage, slug);
      clear();
      setResult(data);
      router.push(`${storePath}/orders`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось оформить заказ. Корзина сохранена.");
    } finally { submissionGuard.current.release(); setPending(false); }
  }

  if (result && demo) return <main className="container grid min-h-[70vh] place-items-center py-12"><div className="card max-w-xl p-10 text-center"><CheckCircle2 className="mx-auto text-[var(--success)]" size={58}/><h1 className="mt-5 text-3xl font-semibold">Демонстрация завершена</h1><p className="muted mt-3">Проверен итог на {money(result.total)}. Заказ не создан, продавцу ничего не отправлено и платёж не проводился.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Link href="/register" className="btn btn-primary">Создать свой магазин</Link><Link href={storePath} className="btn btn-secondary">Вернуться в каталог</Link></div></div></main>;

  if (result) return <main className="container grid min-h-[70vh] place-items-center py-12"><div className="card max-w-xl p-10 text-center"><CheckCircle2 className="mx-auto text-[var(--success)]" size={58}/><h1 className="mt-5 text-3xl font-semibold">{demo?"Пример оформления завершён":`Заказ №${result.orderNumber} принят`}</h1><p className="muted mt-3">{demo?`Пример на ${money(result.total)}. Реальный заказ не создан, продавцу ничего не отправлено и оплата не проводилась.`:`${yandexDelivery?"Товары: ":"Итог: "}${money(result.total)}. ${yandexDelivery?"Магазин сам закажет курьера и сообщит цену доставки отдельно.":"Магазин свяжется с вами для подтверждения."}`}</p>{invited&&guestCheckout&&<p className="mt-4 text-sm text-neutral-600">Вас пригласил друг. Откройте «Мои заказы» и, если ещё не вошли, войдите через Google с этого браузера, чтобы приглашение засчиталось.</p>}<div className="mt-7 flex flex-wrap justify-center gap-3">{demo?<Link href="/register" className="btn btn-primary">Создать свой магазин</Link>:<Link href={`/s/${slug}/orders`} className="btn btn-primary">Мои заказы и карта</Link>}<Link href={`/s/${slug}`} className="btn btn-secondary">Вернуться в магазин</Link></div></div></main>;

  if (!methodsAvailable) return <main className="container grid min-h-[70vh] place-items-center py-12"><div className="card max-w-xl p-9 text-center"><Store className="mx-auto text-[var(--accent)]" size={44}/><h1 className="mt-5 text-3xl font-semibold">Оформление временно закрыто</h1><p className="muted mt-3">Магазин ещё не настроил способы получения заказа.</p><Link href={`/s/${slug}`} className="btn btn-secondary mt-7">Вернуться в каталог</Link></div></main>;

  return <main data-store-checkout className="container py-7 sm:py-10">
    <Link href={`${storePath}/cart`} className="muted inline-flex gap-1 text-sm"><ChevronLeft size={17}/> Корзина</Link>
    <div className="mx-auto mt-5 max-w-3xl sm:mt-8">
      <div className="mb-6"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[var(--tenant-accent)]">Заказ в магазине</p><h1 className="mt-2 font-[family-name:var(--store-display-font)] text-3xl font-semibold sm:text-4xl">Оформление заказа</h1></div>
      <div className="mb-8 flex justify-between">{["Контакты", "Получение", "Подтверждение"].map((title, index) => <div key={title} className={`flex min-w-0 flex-col items-center gap-1 text-[10px] font-bold sm:flex-row sm:gap-2 sm:text-sm ${step >= index + 1 ? "text-[var(--tenant-accent)]" : "opacity-50"}`}><span className="grid size-8 shrink-0 place-items-center rounded-full border">{index + 1}</span><span>{title}</span></div>)}</div>
      <aside aria-label="Состав заказа" className="mb-5 rounded-[var(--store-card-radius)] border border-current/10 bg-[var(--store-surface)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3"><h2 className="font-bold">Ваш заказ</h2><strong>{money(total)}</strong></div>
        <div className="mt-3 grid gap-3">{items.map((item)=>{const selected=variantLabel(item.product,item.variantId);return <div key={item.lineId} className="flex items-center gap-3 border-t border-current/10 pt-3"><CheckoutThumbnail src={item.product.images?.[0]} title={item.product.title}/><span className="min-w-0 flex-1 text-sm"><b className="block truncate">{item.product.title}</b>{selected&&<small className="block font-semibold opacity-70">{selected}</small>}<small className="opacity-60">{item.qty} × {money(item.unitPrice)}</small></span><strong className="text-sm">{money(item.unitPrice*item.qty)}</strong></div>})}</div>
      </aside>
      <section className="rounded-[var(--store-card-radius)] border border-current/10 bg-[var(--store-surface)] p-6 shadow-sm md:p-9">
        {step === 1 && <><h1 className="text-3xl font-semibold">{guestCheckout?"Контакты для заказа":"Ваш профиль"}</h1><p className="muted mt-2">{demo?"Демонстрация оформления: заказ не отправляется продавцу.":guestCheckout?"Магазин позвонит на этот номер для подтверждения заказа и доставки. История сохранится в этом браузере.":"Подтвердите телефон один раз. К нему привяжутся история заказов и карта лояльности этого магазина."}</p>{!authenticated&&phoneAuthAvailable&&<div className="mt-6"><PhoneAuth slug={slug} onAuthenticated={user=>{setAuthenticated(true);setPhone(user.phone??"");setName(String(user.user_metadata?.full_name??user.user_metadata?.name??""));}}/></div>}<div className="mt-6 grid gap-4"><label className="text-sm font-bold">Ваше имя<input value={name} onChange={(event) => setName(event.target.value)} className="input mt-2" maxLength={80} autoComplete="name" aria-label="Ваше имя" placeholder="Например, Серик"/></label>{(demo||guestCheckout)?<label className="text-sm font-bold">Телефон для связи<input value={phone} onChange={event=>setPhone(normalizeKzPhone(event.target.value))} onBlur={()=>setPhone(value=>normalizeKzPhone(value))} className="input mt-2" maxLength={20} type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 777 000 00 00"/><small className="muted mt-1 block">Формат: +7 и 10 цифр</small></label>:authenticated&&<label className="text-sm font-bold">Подтверждённый телефон<input value={phone} readOnly className="input mt-2 bg-[var(--surface-2)]" maxLength={30} type="tel" autoComplete="tel"/></label>}</div>{guestCheckout&&<label className="mt-5 flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={privacyConsent} onChange={event=>setPrivacyConsent(event.target.checked)}/><span>Согласен с <Link href="/legal/privacy" target="_blank" className="underline">политикой конфиденциальности</Link> и <Link href="/legal/offer" target="_blank" className="underline">офертой</Link>.</span></label>}{minOrder > 0 && <p className="muted mt-4 text-sm">Минимальная сумма заказа: {money(minOrder)}</p>}</>}
        {step === 2 && <><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[var(--tenant-accent)]">{presetFulfilment?"Подтверждение":"Оформление"}</p><h1 className="mt-1 text-3xl font-semibold">{presetFulfilment?"Как получите заказ":"Способ получения"}</h1></div>{presetFulfilment&&!changingFulfilment&&<button type="button" className="btn btn-secondary shrink-0 px-4 py-2 text-sm" onClick={()=>setChangingFulfilment(true)}>Изменить</button>}</div><div className="mt-5 grid gap-3">
          {presetFulfilment&&!changingFulfilment?<div className="flex items-center gap-3 rounded-[var(--store-card-radius)] border-2 border-[var(--tenant-accent)] bg-[var(--store-accent-soft)] p-4"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--store-surface)]">{delivery==="courier"?<Truck size={20}/>:<Store size={20}/>}</span><span className="min-w-0"><b className="block">{delivery==="courier"?"Доставка курьером":"Самовывоз"}</b><small className="muted block truncate">{delivery==="courier"?"Укажите адрес и время ниже":readPickupLocation(pickupLocation)?.address??"Адрес подтвердит магазин"}</small></span><Check className="ml-auto shrink-0" size={20}/></div>:<div className="grid grid-cols-2 gap-3">
            {deliveryEnabled && <label className={`relative flex min-h-36 cursor-pointer flex-col rounded-[var(--store-card-radius)] border-2 p-4 transition-colors ${delivery === "courier"?"border-[var(--tenant-accent)] bg-[var(--store-accent-soft)]":"border-current/10"}`}><input className="sr-only" checked={delivery === "courier"} onChange={() => {setDelivery("courier");setChangingFulfilment(false);}} type="radio"/><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--store-surface)]"><Truck size={20} strokeWidth={2}/></span><span className="mt-auto pt-3"><b className="block">Доставка</b><small className="muted mt-1 block">Курьером по адресу</small></span>{delivery==="courier"&&<span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-[var(--tenant-accent)] text-[var(--tenant-accent-ink)]"><Check size={14}/></span>}</label>}
            {pickupEnabled && <label className={`relative flex min-h-36 cursor-pointer flex-col rounded-[var(--store-card-radius)] border-2 p-4 transition-colors ${delivery === "pickup"?"border-[var(--tenant-accent)] bg-[var(--store-accent-soft)]":"border-current/10"}`}><input className="sr-only" checked={delivery === "pickup"} onChange={() => {setDelivery("pickup");setChangingFulfilment(false);}} type="radio"/><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--store-surface)]"><Store size={20} strokeWidth={2}/></span><span className="mt-auto pt-3"><b className="block">Самовывоз</b><small className="muted mt-1 block">Бесплатно из магазина</small></span>{delivery==="pickup"&&<span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-[var(--tenant-accent)] text-[var(--tenant-accent-ink)]"><Check size={14}/></span>}</label>}
          </div>}
          {delivery === "pickup" && <PickupLocationCard value={pickupLocation}/>}
          {delivery === "courier" && <>
            <label className="text-sm font-extrabold">Зона и способ доставки<select value={zoneId} onChange={(event) => {setZoneId(event.target.value);setDeliveryConsent(false);}} className="input mt-2"><option value="">Выберите зону</option>{zones.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.provider==="yandex"?"Курьер через Яндекс · цену сообщит магазин":`Своя доставка · ${money(item.cost)}`}</option>)}</select></label>
            <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
              {([ ["street", "Город и улица", 180], ["house", "Дом", 30] ] as const).map(([field, label, limit]) => <label key={field} className="text-sm font-semibold">{label}
                <input className="input mt-2" value={addressFields[field]} maxLength={limit} required={field === "street" || field === "house"}
                  autoComplete={field === "street" ? "address-line1" : "off"}
                  onChange={event => setAddressFields(previous => ({ ...previous, [field]: event.target.value }))}/>
              </label>)}
            </div>
            <details className="rounded-[var(--store-card-radius)] border border-current/10 p-4">
              <summary className="cursor-pointer text-sm font-bold">Квартира и комментарий</summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">{([
                ["apartment", "Квартира / офис", 20], ["entrance", "Подъезд", 20],
                ["floor", "Этаж", 10], ["comment", "Комментарий курьеру", 150],
              ] as const).map(([field, label, limit]) => <label key={field} className="text-sm font-semibold">{label}<input className="input mt-2" value={addressFields[field]} maxLength={limit} onChange={event => setAddressFields(previous => ({ ...previous, [field]: event.target.value }))}/></label>)}</div>
            </details>
            {zone && <div className="flex gap-3 rounded-[var(--r-card)] bg-[var(--surface-2)] p-4 text-sm"><MapPin className="shrink-0 text-[var(--accent)]" size={18}/><span><b>{zone.provider==="yandex"?"Курьер через Яндекс":"Доставка магазина"} · {zone.name}: {zone.provider==="yandex"?"стоимость сообщит магазин":deliveryCost?money(deliveryCost):"бесплатно"}</b>{zone.provider==="own"&&zone.freeFrom !== null && <small className="muted block">Бесплатно от {money(zone.freeFrom)}</small>}{zone.etaText && <small className="muted block">{zone.etaText}</small>}{zone.provider==="yandex"&&<small className="muted block">Магазин сам закажет курьера от двери до двери и согласует с вами цену до отправки.</small>}</span></div>}
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
            {items.map((item) => <p key={item.lineId} className="flex justify-between gap-4 border-b py-3"><span>{item.product.title}{variantLabel(item.product,item.variantId)&&<small className="block font-semibold opacity-65">{variantLabel(item.product,item.variantId)}</small>} × {item.qty}</span><b>{money(item.unitPrice * item.qty)}</b></p>)}
            <p className="flex justify-between pt-3"><span>Товары</span><b>{money(total)}</b></p>
            <p className="flex justify-between gap-4"><span>Получение</span><b className="text-right">{yandexDelivery?"Курьер через Яндекс · цену сообщит магазин":deliveryCost?money(deliveryCost):"Бесплатно"}</b></p>
            <p className="flex justify-between"><span>Когда</span><b>{timingMode === "scheduled" && requestedDate ? new Intl.DateTimeFormat("ru-KZ", {dateStyle:"medium",timeStyle:"short"}).format(requestedDate) : "Как можно скорее"}</b></p>
            <p className="flex justify-between border-t pt-4 text-xl font-bold"><span>{yandexDelivery?"Итого за товары":"Итого"}</span><span>{money(total + deliveryCost - discount)}</span></p>
            {yandexDelivery&&<label className="flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-950"><input className="mt-1" type="checkbox" checked={deliveryConsent} onChange={event=>setDeliveryConsent(event.target.checked)}/><span>Понимаю, что магазин сам закажет курьера от двери до двери. Цена доставки зависит от расстояния, сейчас не входит в итог и будет согласована со мной до отправки.</span></label>}
          </div>
          <fieldset className="mt-6 space-y-3 rounded-[var(--r-card)] border border-[var(--line)] p-4"><legend className="px-1 font-bold">Оплата товаров</legend>
            {kaspiRemoteEnabled?<div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm"><b>Kaspi Pay · {money(total + deliveryCost - discount)}</b><p className="mt-2 text-sky-950">После создания заказа откроются «Мои заказы». {kaspiRemoteLinkAvailable?"Там нажмите «Оплатить», проверьте сумму заказа и введите её в Kaspi.":"Магазин отправит счёт Kaspi Pay на ваш номер; проверьте в нём сумму заказа."} Заказ останется в ожидании, пока магазин не проверит поступление.</p></div>:<div className="rounded-xl border p-4 text-sm"><b>При получении</b><p className="muted mt-1">Оплатите продавцу наличными или Kaspi QR.</p></div>}
            {yandexDelivery&&<small className="muted block">Стоимость курьера менеджер согласует отдельно до вызова.</small>}
          </fieldset>
          {!guestCheckout&&<label className="mt-4 flex items-start gap-3 rounded-2xl bg-[var(--surface-2)] p-4 text-sm"><input className="mt-1 accent-[var(--accent)]" type="checkbox" checked={marketingConsent} onChange={event=>setMarketingConsent(event.target.checked)}/><span><b>Получать акции этого магазина по SMS</b><small className="muted mt-1 block">Необязательно. Отписаться можно в профиле или через магазин.</small></span></label>}
        </>}
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-[var(--danger)]">{error}</p>}
        <div className="mt-8 flex justify-between"><button disabled={step === 1 || pending} onClick={() => setStep((value) => value - 1)} className="btn btn-secondary disabled:opacity-0">Назад</button>{step < 3 ? <button disabled={(step === 1 && !contactsReady) || (step === 2 && (!deliveryReady || !timingReady))} onClick={() => setStep((value) => value + 1)} className="btn btn-cta disabled:opacity-50">Продолжить</button> : <button disabled={pending || !items.length || total < minOrder || !timingReady || (yandexDelivery&&!deliveryConsent)} onClick={submit} className="btn btn-cta disabled:opacity-50">{pending ? "Оформляем…" : "Подтвердить заказ"}</button>}</div>
      </section>
    </div>
  </main>;
}
