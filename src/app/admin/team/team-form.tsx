"use client";
import { useActionState, useState } from "react";
import { manageTeam } from "./actions";
import { noStaffPermissions,staffModules,staffPresets,type StaffPermissions } from "@/lib/staff-permissions";
import type { StaffAccess } from "@/lib/staff-server";
export function TeamForm({member}:{member?:StaffAccess}){
 const [state,action,pending]=useActionState(manageTeam,{});
 const [permissions,setPermissions]=useState<StaffPermissions>(member?.permissions??noStaffPermissions);
 return <form action={action} className="space-y-4 rounded-2xl border bg-white p-5">
  <h2 className="text-xl font-semibold">{member?member.title:"Пригласить сотрудника"}</h2>
  <input type="hidden" name="action" value={member?"update":"invite"}/>
  {member?<><input type="hidden" name="id" value={member.id}/><input type="hidden" name="revision" value={member.revision}/></>:<label className="block">Email сотрудника<input required type="email" name="email" className="mt-1 block w-full rounded-xl border p-3" autoComplete="off"/></label>}
  <label className="block">Должность<input name="title" required maxLength={80} defaultValue={member?.title} placeholder="Например, менеджер заказов" className="mt-1 block w-full rounded-xl border p-3"/></label>
  <label className="block">Быстрая настройка<select defaultValue="" onChange={e=>{const preset=staffPresets[e.target.value];if(preset)setPermissions(preset.permissions);}} className="mt-1 block w-full rounded-xl border p-3"><option value="">Выберите набор прав или настройте ниже</option>{Object.entries(staffPresets).map(([key,preset])=><option key={key} value={key}>{preset.label}</option>)}</select></label>
  <div className="grid gap-3 sm:grid-cols-2">{Object.entries(staffModules).map(([key,label])=><label key={key}>{label}<select name={key} value={permissions[key as keyof StaffPermissions]} onChange={e=>setPermissions({...permissions,[key]:e.target.value})} className="mt-1 block w-full rounded-xl border p-3"><option value="none">Нет доступа</option><option value="read">Просмотр</option>{key!=="analytics"&&<option value="write">Просмотр и изменение</option>}</select></label>)}</div>
  {member&&<label className="flex gap-2"><input type="checkbox" name="active" defaultChecked={member.active}/>Доступ включён — снимите галочку, чтобы отозвать</label>}
  {member&&<label className="flex gap-2"><input type="checkbox" name="notify_orders" defaultChecked={member.notify_orders}/>Уведомлять о новых заказах на подключённом устройстве — нужен доступ к заказам</label>}
  <p className="text-sm text-neutral-500">Оплата, тариф, права команды и управление владельцем сотруднику недоступны.</p>
  <button disabled={pending} className="rounded-xl bg-neutral-900 px-5 py-3 text-white">{pending?"Сохраняем…":member?"Сохранить права":"Создать приглашение"}</button>
  {state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}
  {state.invitation&&<label className="block">Ссылка приглашения<input readOnly value={typeof window!=="undefined"?window.location.origin+state.invitation:state.invitation} onFocus={e=>e.target.select()} className="block w-full rounded-xl border p-3"/></label>}
 </form>;
}
export function RevokeInvitation({id}:{id:string}){const[state,action,pending]=useActionState(manageTeam,{});return <form action={action}><input type="hidden" name="action" value="revoke_invite"/><input type="hidden" name="id" value={id}/><button disabled={pending} className="underline">Отозвать приглашение</button>{state.error&&<p role="alert">{state.error}</p>}</form>;}
