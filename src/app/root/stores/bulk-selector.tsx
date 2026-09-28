"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { deleteSelectedEmptyStores } from "../actions";

type Store = { id:string; name:string; slug:string; status:string; bulkDeletable:boolean; bulkDeleteBlockReason:string|null };

export function BulkStoreSelector({stores}:{stores:Store[]}) {
  const [selected,setSelected]=useState<string[]>([]);
  const [query,setQuery]=useState("");
  const [state,action,pending]=useActionState(deleteSelectedEmptyStores,{error:""});
  const visible=useMemo(()=>stores.filter(store=>`${store.name} ${store.slug}`.toLowerCase().includes(query.trim().toLowerCase())),[stores,query]);
  const chosen=selected.map(id=>stores.find(store=>store.id===id)).filter((store):store is Store=>Boolean(store));
  const toggle=(store:Store)=>{if(!store.bulkDeletable)return;setSelected(current=>current.includes(store.id)?current.filter(item=>item!==store.id):current.length<20?[...current,store.id]:current);};
  return <form action={action} className="mt-6 space-y-5">
    {selected.map(id=><input key={id} type="hidden" name="store" value={id}/>)}
    <label className="block text-sm font-bold">Поиск магазина<input value={query} onChange={event=>setQuery(event.target.value)} className="input mt-2 w-full" placeholder="Название или адрес витрины"/></label>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span>Найдено {visible.length} · выбрано {selected.length} из 20</span><div className="flex gap-4"><button type="button" className="font-bold text-[#56334D] underline" onClick={()=>setSelected(visible.filter(store=>store.bulkDeletable).slice(0,20).map(store=>store.id))}>Выбрать доступные</button><button type="button" className="font-bold text-slate-600 underline" onClick={()=>setSelected([])}>Снять выбор</button></div></div>
    <div className="divide-y rounded-2xl border border-slate-200 bg-white px-4">
      {visible.map(store=><div key={store.id} className={`flex min-h-16 items-center gap-4 py-3 ${store.bulkDeletable?"":"bg-[#f8f4f7]"}`}>
        <label className={`flex min-w-0 flex-1 items-center gap-4 ${store.bulkDeletable?"cursor-pointer":"cursor-not-allowed"}`}><input type="checkbox" disabled={!store.bulkDeletable} checked={selected.includes(store.id)} onChange={()=>toggle(store)} className="h-5 w-5 accent-[#56334D]" /><span className="min-w-0"><b className="block truncate">{store.name}</b><small className="text-slate-500">/s/{store.slug} · {store.status}</small>{store.bulkDeleteBlockReason?<small className="block font-bold text-[#56334D]">{store.bulkDeleteBlockReason}</small>:null}</span></label>
        <Link href={`/root/stores/${store.id}`} className="text-sm font-bold text-[#56334D]">Открыть</Link>
      </div>)}
      {!visible.length&&<p className="py-8 text-sm text-slate-500">Магазины не найдены.</p>}
    </div>
    {chosen.length>=2?<div className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <h2 className="text-lg font-bold text-red-900">Удалить выбранные ({chosen.length})</h2>
      <p className="mt-2 text-sm text-red-900">Безвозвратно удаляются только пустые магазины. Сервер остановит всю операцию, если один из них содержит товары, заказы, клиентов, платежи или подключения. Аккаунты владельцев остаются.</p>
      <ul className="mt-3 list-inside list-disc text-sm text-red-900">{chosen.map(store=><li key={store.id}>{store.name} · /s/{store.slug}</li>)}</ul>
      <label className="mt-4 block text-sm font-semibold">Причина<input name="reason" required minLength={3} maxLength={1000} className="input mt-1 w-full" /></label>
      <label className="mt-3 block text-sm font-semibold">Введите «УДАЛИТЬ {chosen.length}»<input name="confirmation" required className="input mt-1 w-full" autoComplete="off" /></label>
      {state.error?<p role="alert" className="mt-3 text-sm font-bold text-red-800">{state.error}</p>:null}
      <button disabled={pending} className="mt-4 rounded-xl bg-red-800 px-5 py-3 font-bold text-white disabled:opacity-50">{pending?"Проверяем…":"Проверить и удалить"}</button>
    </div>:<p className="text-sm text-slate-500">Выберите минимум два магазина для массового действия.</p>}
  </form>;
}
