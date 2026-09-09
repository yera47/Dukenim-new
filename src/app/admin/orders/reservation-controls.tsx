"use client";
import React,{useActionState} from "react";
import {manageReservation} from "./reservation-action";
import {reservationLabels,type ReservationRow} from "@/lib/reservations";
export function ReservationControls({reservation:r}:{reservation:ReservationRow}){
 const[state,action,pending]=useActionState(manageReservation,{});
 return <div className="w-full space-y-3 border-t pt-3"><b>Бронь · {reservationLabels[r.status]}</b><p className="text-sm">До {new Date(r.expires_at).toLocaleString("ru-KZ")} · {r.phone}</p>{['reserved','confirmed'].includes(r.status)&&<form action={action} className="flex flex-wrap items-center gap-3"><input name="id" type="hidden" value={r.order_id}/>{r.status==='reserved'&&<button disabled={pending} className="btn btn-secondary" name="action" value="confirm">Подтвердить наличие</button>}<label className="text-sm"><input type="checkbox" name="paidConfirmed"/> Товар выдан, оплата получена наличными</label><button disabled={pending} name="action" value="collect" className="btn btn-primary">Завершить продажу</button><button disabled={pending} name="action" value="cancel" className="btn btn-secondary">Отменить бронь</button></form>}{state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}</div>;
}
