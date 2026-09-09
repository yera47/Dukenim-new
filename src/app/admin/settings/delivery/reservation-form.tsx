"use client";
import React,{useActionState} from "react";
import {saveReservationSettings,type ReservationSettingsState} from "./reservation-actions";
import {readPickupLocation} from "@/lib/pickup-location";
export function ReservationForm({enabled=false,hours=24,location}:{enabled?:boolean;hours?:number;location?:unknown}){
 const [state,action,pending]=useActionState(saveReservationSettings,{} as ReservationSettingsState),point=readPickupLocation(location);
 return <form action={action} className="card space-y-4 p-5"><h2 className="text-xl font-semibold">Бронь в магазине</h2><p className="text-sm text-neutral-500">Дополнительный вариант без онлайн-оплаты. Товар временно убирается из доступного остатка; по истечении срока возвращается. Оформленная бронь ещё не выручка.</p><fieldset disabled={pending} className="space-y-4">
 <label className="flex gap-2"><input type="checkbox" name="enabled" defaultChecked={enabled}/>Разрешить бронирование</label>
 <label className="block">Хранить, часов (1–72)<input className="input mt-2" name="holdHours" type="number" min={1} max={72} defaultValue={hours}/></label>
 {([['address','Адрес магазина'],['hours','Часы работы'],['preparation','Когда можно забрать'],['gisUrl','Ссылка на 2ГИС'],['yandexUrl','Ссылка на Яндекс Карты']] as const).map(([key,label])=><label key={key} className="block text-sm">{label}<input className="input mt-2" name={key} defaultValue={point?.[key]??""} maxLength={key.includes('Url')?1500:300}/></label>)}
 <input type="hidden" name="instructions" value={point?.instructions??""}/><input type="hidden" name="embedUrl" value={point?.embedUrl??""}/>
 <button className="btn btn-primary">{pending?"Сохраняем…":"Сохранить бронирование"}</button></fieldset>{state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}</form>;
}
