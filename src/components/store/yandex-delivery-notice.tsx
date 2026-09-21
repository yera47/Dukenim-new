"use client";

import { useEffect, useState } from "react";
import { Truck } from "lucide-react";

export const yandexNoticeKey = (slug: string) => `dukenim:${slug}:yandex-delivery-notice:v2`;

export function YandexDeliveryNotice({ slug, storeName }: { slug: string; storeName: string }) {
  const [accepted, setAccepted] = useState(false);
  useEffect(() => {
    setAccepted(window.localStorage.getItem(yandexNoticeKey(slug)) === "yes");
  }, [slug]);
  useEffect(() => {
    if (accepted) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = old; };
  }, [accepted]);
  if (accepted) return null;
  return <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[#101923] p-4 text-white" role="dialog" aria-modal="true" aria-labelledby="yandex-notice-title">
    <section className="w-full max-w-lg rounded-[2rem] bg-white p-6 text-[#17212d] shadow-2xl sm:p-9">
      <span className="grid size-14 place-items-center rounded-2xl bg-[#e8effa] text-[#284c7b]"><Truck size={27}/></span>
      <p className="mt-7 text-xs font-extrabold uppercase tracking-[.18em] text-[#60718a]">Перед просмотром меню</p>
      <h2 id="yandex-notice-title" className="mt-2 text-3xl font-extrabold leading-tight">Доставка через Яндекс</h2>
      <p className="mt-4 leading-7">{storeName} может передать ваш заказ курьеру Яндекс Доставки. Магазин сам оформляет вызов курьера после подтверждения заказа.</p>
      <div className="mt-5 space-y-2 rounded-2xl bg-[#f2f5fa] p-4 text-sm leading-6">
        <p><b>Цена доставки:</b> заранее не показывается и зависит от расстояния. Менеджер сообщит её после заказа.</p>
        <p><b>После заказа:</b> менеджер сам оформит доставку от двери до двери, подтвердит адрес и согласует стоимость с вами. Курьер не вызывается автоматически.</p>
        <p><b>Оплата:</b> наличными при получении. Менеджер уточнит, кому оплатить товары и доставку.</p>
      </div>
      <button type="button" onClick={() => { window.localStorage.setItem(yandexNoticeKey(slug), "yes"); setAccepted(true); }} className="mt-6 w-full rounded-2xl bg-[#183453] px-5 py-4 text-base font-extrabold text-white hover:bg-[#254a73]">Понятно, продолжить</button>
    </section>
  </div>;
}
