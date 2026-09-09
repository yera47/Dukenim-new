"use client";
import React,{useState} from "react";
import Link from "next/link";
import {useCart} from "@/components/store/cart-provider";
import {PickupLocationCard} from "@/components/store/pickup-location";
import type {PickupLocation} from "@/lib/pickup-location";
import {money} from "@/lib/demo-data";
import {reservationLabels} from "@/lib/reservations";
export function ReservationCheckout({slug,hours,location}:{slug:string;hours:number;location:PickupLocation}){
 const {items,total,clear}=useCart();const[name,setName]=useState(''),[phone,setPhone]=useState(''),[pending,setPending]=useState(false),[message,setMessage]=useState('');
 const[result,setResult]=useState<{number:number;expires:string;total:number}|null>(null);
 async function submit(event:React.FormEvent){
  event.preventDefault();if(pending||!items.length)return;setPending(true);setMessage('');
  try{
   const payload={slug,name:name.trim(),phone:phone.replace(/\D/g,''),items:items.map(item=>({variantId:item.variantId,qty:item.qty})).sort((a,b)=>a.variantId.localeCompare(b.variantId))};
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload))))).map(b=>b.toString(16).padStart(2,'0')).join('');
   const key=`dukenim-reservation:${hash}`;let requestId=sessionStorage.getItem(key);if(!requestId){requestId=crypto.randomUUID();sessionStorage.setItem(key,requestId);}
   const response=await fetch('/api/reservations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestId})});const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Не удалось подтвердить бронь.');
   if(!['reserved','confirmed'].includes(data.reservationStatus))throw new Error(`Эта бронь уже закрыта: ${reservationLabels[data.reservationStatus as keyof typeof reservationLabels]??'проверьте у магазина'}. Для повторной брони свяжитесь с магазином.`);
   if(!Number.isSafeInteger(data.orderNumber)||data.orderNumber<1||!Number.isSafeInteger(data.total)||data.total<0||!Number.isFinite(Date.parse(data.expiresAt)))throw new Error('Неполный ответ. Проверьте бронь у магазина.');
   setResult({number:data.orderNumber,expires:data.expiresAt,total:data.total});clear();
  }catch(error){setMessage(error instanceof Error?error.message:'Ответ не подтверждён. Повторная отправка с теми же данными не создаст ещё одну бронь.');}finally{setPending(false);}
 }
 return <main className="container max-w-3xl space-y-5 py-10"><Link href={`/s/${slug}/checkout`} className="text-sm underline">← К оформлению заказа</Link><h1 className="text-3xl font-semibold">{result?`Бронь №${result.number} принята`:'Забронировать в магазине'}</h1><p>Без онлайн-оплаты. Храним товар {hours} ч. с момента бронирования. Дождитесь подтверждения магазина перед поездкой. Для отмены свяжитесь с магазином.</p><PickupLocationCard value={location}/>{result?<p role="status">Сумма при покупке: {money(result.total)}. Бронь до {new Date(result.expires).toLocaleString('ru-KZ')}. После этого товар вернётся в продажу.</p>:<form onSubmit={submit} className="card space-y-4 p-6"><p>Товары: {items.length} · {money(total)}</p><input aria-label="Имя" className="input" required minLength={2} maxLength={80} placeholder="Серик" value={name} onChange={e=>setName(e.target.value)}/><input aria-label="Телефон" className="input" type="tel" required maxLength={30} placeholder="Телефон" value={phone} onChange={e=>setPhone(e.target.value)}/><button disabled={pending||!items.length} className="btn btn-primary">{pending?'Бронируем…':'Подтвердить бронь'}</button>{message&&<p role="alert">{message}</p>}</form>}</main>;
}
