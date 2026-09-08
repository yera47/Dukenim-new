"use client";
import { useState } from "react";
import { readPickupLocation } from "@/lib/pickup-location";

export function PickupLocationCard({ value }: { value: unknown }) {
  const [showMap, setShowMap] = useState(false);
  const point = readPickupLocation(value);
  if (!point) return null;
  return <section className="space-y-3 rounded-xl border p-4" aria-label="Место самовывоза">
    <h3 className="font-semibold">Где забрать заказ</h3>
    <p className="select-text whitespace-pre-wrap break-words">{point.address}</p>
    <p>Часы работы: {point.hours}</p><p>Готовность: {point.preparation}</p>
    {point.instructions && <p className="whitespace-pre-wrap break-words">{point.instructions}</p>}
    <div className="flex flex-wrap gap-3">
      {point.gisUrl && <a className="underline" href={point.gisUrl} target="_blank" rel="noopener noreferrer">Открыть в 2ГИС ↗</a>}
      {point.yandexUrl && <a className="underline" href={point.yandexUrl} target="_blank" rel="noopener noreferrer">Маршрут в Яндекс Картах ↗</a>}
    </div>
    {point.embedUrl && !showMap && <button type="button" className="btn btn-secondary" onClick={() => setShowMap(true)}>Показать карту Яндекса</button>}
    {point.embedUrl && showMap && <iframe title="Карта пункта самовывоза" src={point.embedUrl} loading="lazy" referrerPolicy="no-referrer" className="h-64 w-full rounded-xl border-0"/>}
    {point.embedUrl && <p className="text-xs text-neutral-500">Карта загружается с Яндекса по вашему нажатию. Если она недоступна, используйте адрес или ссылки выше.</p>}
  </section>;
}
