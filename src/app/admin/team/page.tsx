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
 {(members.error||invites.error)?<p role="alert">Раздел команды временно недоступен. Доступ никому не выдан.</p>:<><TeamForm/>{members.data?.map(member=><TeamForm key={`${member.id}-${member.revision}`} member={member}/>)}<section><h2 className="mb-3 text-xl font-semibold">Приглашения</h2>{invites.data?.length?invites.data.map(invite=><article key={invite.id} className="mb-3 rounded-xl border p-4"><p>{invite.email} · {invite.title}</p><p>{invite.accepted_at?"Принято":invite.revoked_at?"Отозвано":Date.parse(invite.expires_at)<Date.now()?"Срок истёк":"Ожидает принятия"}</p>{!invite.accepted_at&&!invite.revoked_at&&<RevokeInvitation id={invite.id}/>}</article>):<p>Пока нет приглашений.</p>}</section></>}
 </main>;
}
