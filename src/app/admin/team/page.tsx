import { requireRole } from "@/lib/auth";
import { createStaffClient } from "@/lib/staff-server";
import { TeamForm, RevokeInvitation, RemoveMember } from "./team-form";
import { KeyRound, Link2, ShieldCheck, UsersRound } from "lucide-react";

export default async function TeamPage() {
  const context = await requireRole(["owner"]);
  if (!context.tenantId) return null;
  const client = await createStaffClient();
  const [members, invites] = await Promise.all([
    client.from("staff_access").select("*").eq("tenant_id", context.tenantId).order("created_at", { ascending: true }),
    client.from("staff_invitations").select("id,email,title,expires_at,accepted_at,accepted_by,revoked_at,created_at").eq("tenant_id", context.tenantId).order("created_at", { ascending: false }).limit(50),
  ]);
  const emailByUser = new Map((invites.data ?? []).filter(invite => invite.accepted_by).map(invite => [invite.accepted_by as string, invite.email]));

  return <main className="mx-auto max-w-4xl space-y-6 p-5 pb-28">
    <header><div className="data-label">ДОСТУП К МАГАЗИНУ</div><h1 className="mt-2 text-3xl font-extrabold">Сотрудники</h1><p className="mt-2 max-w-2xl leading-7 text-[var(--ink-60)]">Пригласите сотрудника по защищённой ссылке. Вы в любой момент можете изменить его права, временно закрыть доступ или удалить из команды.</p></header>
    <section className="grid gap-3 sm:grid-cols-3">
      <article className="card p-4"><Link2 size={20} className="text-[var(--accent)]"/><b className="mt-3 block">Одноразовая ссылка</b><p className="mt-1 text-xs leading-5 text-[var(--ink-60)]">Действует 48 часов и привязана к email.</p></article>
      <article className="card p-4"><KeyRound size={20} className="text-[var(--accent)]"/><b className="mt-3 block">Свой пароль</b><p className="mt-1 text-xs leading-5 text-[var(--ink-60)]">Сотрудник сам создаёт пароль при входе.</p></article>
      <article className="card p-4"><ShieldCheck size={20} className="text-[var(--accent)]"/><b className="mt-3 block">Минимальные права</b><p className="mt-1 text-xs leading-5 text-[var(--ink-60)]">Каждый запрос проверяется в базе заново.</p></article>
    </section>
    {(members.error || invites.error) ? <p role="alert" className="rounded-xl bg-red-50 p-4 font-semibold text-red-700">Раздел команды временно недоступен. Доступ никому не выдан и не изменён.</p> : <>
      <details className="card p-5"><summary className="cursor-pointer list-none font-extrabold text-[var(--accent)]">+ Добавить сотрудника</summary><div className="mt-4"><TeamForm/></div></details>
      <section className="card p-5"><div className="mb-4 flex items-center gap-3"><UsersRound className="text-[var(--accent)]"/><h2 className="text-xl font-extrabold">Команда · {members.data?.length ?? 0}</h2></div>{members.data?.length ? members.data.map(member => <details key={`${member.id}-${member.revision}`} className="border-t border-[var(--line)] py-4 first:border-0"><summary className="flex cursor-pointer list-none items-center justify-between gap-4"><span><b className="block">{member.title}</b><small className="text-[var(--ink-60)]">{emailByUser.get(member.user_id) ?? "Email скрыт для старого приглашения"}</small></span><span className={member.active ? "status-ready rounded-full px-3 py-1 text-xs font-bold" : "badge"}>{member.active ? "Доступ включён" : "Доступ отключён"}</span></summary><div className="mt-4 space-y-4"><TeamForm member={member} email={emailByUser.get(member.user_id)}/><RemoveMember id={member.id} title={member.title}/></div></details>) : <p className="text-sm leading-6 text-[var(--ink-60)]">Пока работает только владелец. Добавьте сотрудника и выдайте только необходимые ему разделы.</p>}</section>
      <section className="card p-5"><h2 className="mb-3 text-xl font-extrabold">Приглашения</h2>{invites.data?.length ? invites.data.map(invite => { const expired = Date.parse(invite.expires_at) < Date.now(); const status = invite.accepted_at ? "Принято" : invite.revoked_at ? "Отозвано" : expired ? "Срок истёк" : "Ожидает сотрудника"; return <article key={invite.id} className="border-t border-[var(--line)] py-4 first:border-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><b>{invite.email}</b><p className="mt-1 text-sm text-[var(--ink-60)]">{invite.title} · {status}</p></div>{!invite.accepted_at && !invite.revoked_at && !expired && <RevokeInvitation id={invite.id}/>}</div></article>; }) : <p className="text-sm text-[var(--ink-60)]">Пока нет приглашений.</p>}</section>
    </>}
  </main>;
}
