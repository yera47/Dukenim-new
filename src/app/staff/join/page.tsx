"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, LogIn, ShieldCheck } from "lucide-react";
import { acceptInvitation, registerStaff } from "./actions";
import { readStaffInvitationToken, STAFF_PASSWORD_MIN_LENGTH, staffInvitationPath } from "@/lib/staff-invitation";

export default function JoinTeam() {
  const [token, setToken] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [state, action, pending] = useActionState(acceptInvitation, {});
  const [registration, register, registering] = useActionState(registerStaff, {});

  useEffect(() => {
    const value = readStaffInvitationToken(window.location.search, window.location.hash);
    setToken(value);
    setLoaded(true);
    if (value) window.history.replaceState(null, "", "/staff/join");
  }, []);

  const next = staffInvitationPath(token);
  return <main className="mx-auto grid min-h-[100dvh] max-w-xl place-content-center gap-5 p-5 py-10">
    <div><div className="data-label">КОМАНДА МАГАЗИНА</div><h1 className="mt-3 text-3xl font-extrabold">Присоединиться к команде</h1><p className="mt-3 leading-7 text-[var(--ink-60)]">Приглашение привязано к вашему email. В рабочем кабинете будут видны только разделы, разрешённые владельцем.</p></div>
    {loaded && !token && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">Ссылка приглашения неполная или устарела. Попросите владельца создать и скопировать новую ссылку.</p>}
    <section className="grid gap-3 sm:grid-cols-3">{[
      [ShieldCheck, "Одноразово", "После принятия ссылка больше не работает."],
      [KeyRound, "Ваш пароль", `Минимум ${STAFF_PASSWORD_MIN_LENGTH} символов.`],
      [LogIn, "Сразу в кабинет", "Доступ включится после регистрации."],
    ].map(([Icon, title, text]) => { const Component = Icon as typeof ShieldCheck; return <article key={String(title)} className="card p-4"><Component size={19} className="text-[var(--accent)]"/><b className="mt-2 block text-sm">{String(title)}</b><p className="mt-1 text-xs leading-5 text-[var(--ink-60)]">{String(text)}</p></article>; })}</section>
    <details className="card p-5" open><summary className="cursor-pointer list-none text-lg font-extrabold">Новый сотрудник · создать аккаунт</summary><p className="mt-2 text-sm leading-6 text-[var(--ink-60)]">Введите тот же email, который указал владелец, и придумайте отдельный надёжный пароль. Пароль владельцу не показывается.</p><form action={register} className="mt-4 space-y-4"><input type="hidden" name="token" value={token}/><label className="block text-sm font-bold">Email приглашения<input required type="email" name="email" autoComplete="email" className="input mt-2" placeholder="employee@example.com"/></label><label className="block text-sm font-bold">Новый пароль<input required type="password" name="password" minLength={STAFF_PASSWORD_MIN_LENGTH} maxLength={128} autoComplete="new-password" className="input mt-2" aria-describedby="staff-password-help"/></label><p id="staff-password-help" className="text-xs leading-5 text-[var(--ink-60)]">Не менее {STAFF_PASSWORD_MIN_LENGTH} символов. Можно использовать длинную фразу; вставка из менеджера паролей разрешена.</p><button disabled={registering || !token} className="btn btn-primary w-full">{registering ? "Создаём защищённый аккаунт…" : "Создать аккаунт и войти"}</button>{registration.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{registration.error}</p>}</form></details>
    <section className="card space-y-4 p-5"><h2 className="text-lg font-extrabold">Уже есть аккаунт Dukenim</h2><p className="text-sm leading-6 text-[var(--ink-60)]">Войдите с тем же email. После входа вернитесь сюда и примите приглашение.</p><Link href={`/login?next=${encodeURIComponent(next)}`} className="btn btn-secondary w-full">Войти с существующим аккаунтом</Link><form action={action}><input type="hidden" name="token" value={token}/><button disabled={pending || !token} className="btn btn-primary w-full">{pending ? "Проверяем…" : "Принять приглашение после входа"}</button>{state.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{state.error}</p>}</form></section>
    <p className="text-center text-xs leading-5 text-[var(--ink-60)]">Не пересылайте приглашение другим людям. Владелец может изменить права или закрыть доступ в любой момент.</p>
  </main>;
}
