import { requireRole } from "@/lib/auth";
import { createStaffClient } from "@/lib/staff-server";
import { TeamForm,RevokeInvitation } from "./team-form";
export default async function TeamPage(){
 const context=await requireRole(["owner"]);if(!context.tenantId)return null;
 const client=await createStaffClient();
 const [members,invites]=await Promise.all([
  client.from("staff_access").select("*").eq("tenant_id",context.tenantId),
  client.from("staff_invitations").select("id,email,title,expires_at,accepted_at,revoked_at").eq("tenant_id",context.tenantId).order("created_at",{ascending:false}).limit(50)
 ]);
 return <main className="mx-auto max-w-4xl space-y-6 p-5"><header><h1 className="text-3xl font-semibold">Команда магазина</h1><p className="mt-2 text-neutral-500">Пригласите сотрудника по email. Права можно изменить или отключить в любое время.</p></header>
 {(members.error||invites.error)?<p role="alert">Раздел команды временно недоступен. Доступ никому не выдан.</p>:<><details className="card p-5"><summary className="cursor-pointer font-semibold">+ Добавить сотрудника</summary><div className="mt-4"><TeamForm/></div></details><section className="card p-5"><h2 className="mb-4 text-xl font-semibold">Сотрудники · {members.data?.length??0}</h2>{members.data?.length?members.data.map(member=><details key={`${member.id}-${member.revision}`} className="border-t py-4"><summary className="flex cursor-pointer items-center justify-between gap-4"><span className="font-semibold">{member.title}</span><span className={member.active?"status-ready rounded-full px-3 py-1 text-sm":"badge"}>{member.active?"Доступ включён":"Доступ отключён"}</span></summary><div className="mt-4"><TeamForm member={member}/></div></details>):<p className="text-sm text-neutral-500">Пока работает только владелец. Добавьте сотрудника и выберите, какие разделы ему доступны.</p>}</section><section><h2 className="mb-3 text-xl font-semibold">Приглашения</h2>{invites.data?.length?invites.data.map(invite=><article key={invite.id} className="mb-3 rounded-xl border p-4"><p>{invite.email} · {invite.title}</p><p>{invite.accepted_at?"Принято":invite.revoked_at?"Отозвано":Date.parse(invite.expires_at)<Date.now()?"Срок истёк":"Ожидает принятия"}</p>{!invite.accepted_at&&!invite.revoked_at&&<RevokeInvitation id={invite.id}/>}</article>):<p>Пока нет приглашений.</p>}</section></>}
 </main>;
}
