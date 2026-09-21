"use client";
import { useActionState } from "react";
import { readPickupLocation } from "@/lib/pickup-location";
import { PickupLocationCard } from "@/components/store/pickup-location";
import { savePickupSettings, type DeliveryState } from "./actions";
import { WorkingHoursField } from "@/components/admin/working-hours";

export function PickupForm({ enabled, location }: { enabled: boolean; location: unknown }) {
  const point = readPickupLocation(location);
  const [state, action, pending] = useActionState(savePickupSettings, {} as DeliveryState);
  return <section className="space-y-4 rounded-2xl border p-5">
    <h2 className="text-xl font-semibold">Самовывоз</h2>
    <p className="text-sm">Сейчас оплата при получении. Онлайн-предоплата подключается отдельно; эти настройки не включают списание денег.</p>
    <form action={action} className="space-y-4">
      <fieldset disabled={pending} className="space-y-4">
        <label className="flex gap-3"><input type="checkbox" name="enabled" defaultChecked={enabled}/> Предлагать самовывоз покупателям</label>
        {([
          ["address", "Адрес пункта", "Город, улица, дом, вход", 300],
          ["instructions", "Как получить заказ", "Этаж, ориентир, что сообщить сотруднику", 500],
          ["gisUrl", "Ссылка «Поделиться» из 2ГИС", "https://2gis.kz/…", 1500],
          ["yandexUrl", "Ссылка на точку в Яндекс Картах или Навигаторе", "https://yandex.ru/navi?…", 1500],
          ["embedUrl", "Ссылка или код виджета Яндекс Карт — необязательно", "Вставьте ссылку или весь код <iframe …>", 1500],
        ] as const).map(([name,label,placeholder,max]) => <label key={name} className="block text-sm">{label}<input name={name} defaultValue={point?.[name] ?? ""} maxLength={max} placeholder={placeholder} className="input mt-1 w-full"/></label>)}
        <WorkingHoursField defaultValue={point?.hours}/>
        <input type="hidden" name="preparation" value="После подтверждения готовности продавцом в разделе «Мои заказы»"/>
        <p className="text-sm">Покупатель увидит «Можно забрать», когда вы подтвердите сборку заказа. Предполагаемое время не заменяет подтверждение наличия.</p>
        <p className="text-sm">Откройте точку в Яндекс Картах или Навигаторе → «Поделиться» → «Скопировать ссылку». Для карты на сайте можно вставить весь код виджета: мы извлечём безопасную ссылку сами. Адрес проверьте перед сохранением.</p>
        <label className="flex gap-3 text-sm"><input name="confirmed" type="checkbox"/> Адрес, часы и точку проверил; эти сведения можно показывать покупателям</label>
        <button className="btn btn-primary" type="submit">{pending ? "Сохраняем…" : "Сохранить самовывоз"}</button>
      </fieldset>
      {state.error && <p role="alert" className="text-red-700">{state.error}</p>}
      {state.success && <p role="status">{state.success}</p>}
    </form>
    {point && <><p className="text-sm font-semibold">Сохранённые условия для покупателя</p><PickupLocationCard value={point}/></>}
  </section>;
}
