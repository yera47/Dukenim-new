"use client";
import { useActionState } from "react";
import { readPickupLocation } from "@/lib/pickup-location";
import { PickupLocationCard } from "@/components/store/pickup-location";
import { savePickupSettings, type DeliveryState } from "./actions";

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
          ["hours", "Часы работы", "Например: пн–сб, 10:00–19:00", 200],
          ["preparation", "Когда заказ готов", "Например: после подтверждения магазина, в течение 2 часов", 200],
          ["instructions", "Как получить заказ", "Этаж, ориентир, что сообщить сотруднику", 500],
          ["gisUrl", "Ссылка «Поделиться» из 2ГИС", "https://2gis.kz/…", 1500],
          ["yandexUrl", "Ссылка на точку или маршрут в Яндекс Картах", "https://yandex.kz/maps/…", 1500],
          ["embedUrl", "Ссылка src из виджета Яндекс Карт — необязательно", "https://api-maps.yandex.ru/frame/v1/…", 1500],
        ] as const).map(([name,label,placeholder,max]) => <label key={name} className="block text-sm">{label}<input name={name} defaultValue={point?.[name] ?? ""} maxLength={max} placeholder={placeholder} className="input mt-1 w-full"/></label>)}
        <p className="text-sm">Откройте свою точку в картах → «Поделиться». Для карты на сайте скопируйте только адрес внутри src=&quot;…&quot; из «Виджет с картой». Адрес не определяется автоматически — проверьте точку перед сохранением.</p>
        <label className="flex gap-3 text-sm"><input name="confirmed" type="checkbox"/> Адрес, часы и точку проверил; эти сведения можно показывать покупателям</label>
        <button className="btn btn-primary" type="submit">{pending ? "Сохраняем…" : "Сохранить самовывоз"}</button>
      </fieldset>
      {state.error && <p role="alert" className="text-red-700">{state.error}</p>}
      {state.success && <p role="status">{state.success}</p>}
    </form>
    {point && <><p className="text-sm font-semibold">Сохранённые условия для покупателя</p><PickupLocationCard value={point}/></>}
  </section>;
}
