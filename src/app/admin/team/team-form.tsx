"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Copy, ShieldCheck, Trash2, UserRoundCheck } from "lucide-react";
import { manageTeam } from "./actions";
import { noStaffPermissions, staffModules, staffPresets, type StaffPermissions } from "@/lib/staff-permissions";
import type { StaffAccess } from "@/lib/staff-server";

function SubmitMessage({ error, success }: { error?: string; success?: string }) {
  return <>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
    {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{success}</p>}
  </>;
}

export function TeamForm({ member, email }: { member?: StaffAccess; email?: string }) {
  const [state, action, pending] = useActionState(manageTeam, {});
  const [permissions, setPermissions] = useState<StaffPermissions>(member?.permissions ?? noStaffPermissions);
  const [copied, setCopied] = useState(false);
  const invitationInput = useRef<HTMLInputElement>(null);
  const invitation = state.invitation ? (typeof window !== "undefined" ? window.location.origin + state.invitation : state.invitation) : "";

  const copyInvitation = async () => {
    if (!invitation) return;
    try {
      await navigator.clipboard.writeText(invitation);
    } catch {
      invitationInput.current?.focus();
      invitationInput.current?.select();
      document.execCommand("copy");
    }
    setCopied(true);
  };

  return <form action={action} className="space-y-5 rounded-2xl border border-[var(--line)] bg-white p-5">
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><UserRoundCheck size={19}/></span>
      <div><h2 className="text-xl font-extrabold">{member ? member.title : "Пригласить сотрудника"}</h2>
      <p className="mt-1 text-sm leading-6 text-[var(--ink-60)]">{member ? `${email ?? "Аккаунт сотрудника"} · измените роль или отключите доступ.` : "Укажите email, выберите роль и отправьте сотруднику защищённую одноразовую ссылку."}</p></div>
    </div>
    <input type="hidden" name="action" value={member ? "update" : "invite"}/>
    {member ? <><input type="hidden" name="id" value={member.id}/><input type="hidden" name="revision" value={member.revision}/></> :
      <label className="block text-sm font-bold">Email сотрудника<input required type="email" name="email" className="input mt-2" autoComplete="off" placeholder="employee@example.com"/></label>}
    <label className="block text-sm font-bold">Должность<input name="title" required maxLength={80} defaultValue={member?.title} placeholder="Например, менеджер заказов" className="input mt-2"/></label>
    <label className="block text-sm font-bold">Готовая роль<select defaultValue="" onChange={event => { const preset = staffPresets[event.target.value]; if (preset) setPermissions(preset.permissions); }} className="input mt-2"><option value="">Настроить права вручную</option>{Object.entries(staffPresets).map(([key, preset]) => <option key={key} value={key}>{preset.label}</option>)}</select></label>
    <fieldset><legend className="text-sm font-extrabold">Доступ к разделам</legend><p className="mt-1 text-xs leading-5 text-[var(--ink-60)]">Давайте только те права, которые нужны для работы. Тариф, оплата, команда и настройки владельца всегда закрыты.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{Object.entries(staffModules).map(([key, label]) => <label key={key} className="text-sm font-bold">{label}<select name={key} value={permissions[key as keyof StaffPermissions]} onChange={event => setPermissions({...permissions, [key]: event.target.value})} className="input mt-2"><option value="none">Нет доступа</option><option value="read">Только просмотр</option>{key !== "analytics" && <option value="write">Просмотр и изменение</option>}</select></label>)}</div>
    </fieldset>
    {member && <div className="space-y-3 rounded-xl bg-[var(--surface)] p-4">
      <label className="flex items-start gap-3 text-sm font-bold"><input type="checkbox" name="active" defaultChecked={member.active} className="mt-1 size-4"/><span>Доступ включён<small className="mt-1 block font-normal text-[var(--ink-60)]">Снимите галочку и сохраните: все новые запросы сотрудника будут отклоняться.</small></span></label>
      <label className="flex items-start gap-3 text-sm font-bold"><input type="checkbox" name="notify_orders" defaultChecked={member.notify_orders} disabled={permissions.orders === "none"} className="mt-1 size-4"/><span>Уведомлять о новых заказах<small className="mt-1 block font-normal text-[var(--ink-60)]">Работает только при доступе к заказам и на подключённом устройстве.</small></span></label>
    </div>}
    <button disabled={pending} className="btn btn-primary w-full sm:w-auto">{pending ? "Сохраняем…" : member ? "Сохранить права" : "Создать защищённую ссылку"}</button>
    <SubmitMessage error={state.error} success={state.success}/>
    {state.invitation && <div className="rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-4">
      <div className="flex items-center gap-2 font-extrabold text-[var(--accent)]"><ShieldCheck size={18}/> Приглашение готово</div>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6 text-[var(--ink-70)]"><li>Нажмите «Скопировать ссылку».</li><li>Отправьте её лично указанному сотруднику.</li><li>Сотрудник откроет ссылку, придумает пароль и войдёт в рабочий кабинет.</li></ol>
      <input ref={invitationInput} aria-label="Ссылка приглашения" readOnly value={invitation} onFocus={event => event.target.select()} className="input mt-3 font-mono text-xs"/>
      <button type="button" className="btn btn-secondary mt-3 w-full sm:w-auto" onClick={copyInvitation}>{copied ? <Check size={17}/> : <Copy size={17}/>} {copied ? "Ссылка скопирована" : "Скопировать ссылку"}</button>
      <p className="mt-3 text-xs leading-5 text-[var(--ink-60)]">Ссылка действует 48 часов, используется один раз и не должна публиковаться в общем чате.</p>
    </div>}
  </form>;
}

export function RevokeInvitation({ id }: { id: string }) {
  const [state, action, pending] = useActionState(manageTeam, {});
  return <form action={action} className="mt-3"><input type="hidden" name="action" value="revoke_invite"/><input type="hidden" name="id" value={id}/><button disabled={pending} className="btn btn-secondary text-sm">{pending ? "Отзываем…" : "Отозвать ссылку"}</button><SubmitMessage error={state.error} success={state.success}/></form>;
}

export function RemoveMember({ id, title }: { id: string; title: string }) {
  const [state, action, pending] = useActionState(manageTeam, {});
  return <form action={action} className="border-t border-[var(--line)] pt-4" onSubmit={event => { if (!window.confirm(`Удалить «${title}» из команды? Доступ к магазину закроется сразу.`)) event.preventDefault(); }}>
    <input type="hidden" name="action" value="remove"/><input type="hidden" name="id" value={id}/>
    <button disabled={pending} className="inline-flex items-center gap-2 text-sm font-bold text-red-700"><Trash2 size={16}/>{pending ? "Удаляем…" : "Удалить из команды"}</button>
    <p className="mt-2 text-xs leading-5 text-[var(--ink-60)]">История действий сохранится в журнале безопасности. Чтобы вернуть сотрудника, создайте новую ссылку.</p>
    <SubmitMessage error={state.error} success={state.success}/>
  </form>;
}
