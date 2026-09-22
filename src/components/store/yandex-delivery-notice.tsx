"use client";

import React, { useEffect, useState } from "react";
import { Truck } from "lucide-react";

export const yandexNoticeKey = (slug: string) => `dukenim:${slug}:yandex-delivery-notice:v4`;

export function YandexDeliveryNotice({ slug, storeName, kaspiRemoteEnabled }: { slug: string; storeName: string; kaspiRemoteEnabled: boolean }) {
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
  return <div className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-[#101923] p-4 text-white" role="dialog" aria-modal="true" aria-labelledby="yandex-notice-title">
    <section className="w-full max-w-lg rounded-[2rem] bg-white p-6 text-[#17212d] shadow-2xl sm:p-9">
      <span className="grid size-14 place-items-center rounded-2xl bg-[#e8effa] text-[#284c7b]"><Truck size={27}/></span>
      <p className="mt-7 text-xs font-extrabold uppercase tracking-[.18em] text-[#60718a]">Перед просмотром меню</p>
      <h2 id="yandex-notice-title" className="mt-2 text-3xl font-extrabold leading-tight">Курьера закажет магазин</h2>
      <p className="mt-4 leading-7">{storeName} получит ваш адрес и телефон, подтвердит заказ и сам оформит доставку через Яндекс от двери до двери.</p>
      <div className="mt-5 space-y-2 rounded-2xl bg-[#f2f5fa] p-4 text-sm leading-6">
        <p><b>Цена доставки:</b> зависит от расстояния и сейчас не входит в стоимость товаров. Менеджер сообщит её до вызова курьера.</p>
        <p><b>После заказа:</b> магазин свяжется с вами, проверит адрес и сам закажет курьера. На сайте курьер не вызывается автоматически.</p>
        <p><b>Оплата:</b> товары — {kaspiRemoteEnabled ? "через Kaspi Pay после оформления заказа" : "магазину при получении"}. Способ оплаты доставки согласуйте с менеджером.</p>
      </div>
      <button type="button" onClick={() => { window.localStorage.setItem(yandexNoticeKey(slug), "yes"); setAccepted(true); }} className="mt-6 w-full rounded-2xl bg-[#183453] px-5 py-4 text-base font-extrabold text-white hover:bg-[#254a73]">Понимаю условия · открыть магазин</button>
    </section>
  </div>;
}
