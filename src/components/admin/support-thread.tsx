import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {requireRole} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {SupportReply} from "./support-reply";
export async function SupportThread({id,platform=false}:{id:string;platform?:boolean}) {
 const context=await requireRole(platform?["superadmin"]:["owner"]);
 if(!z.string().uuid().safeParse(id).success)notFound();
 const client=await createClient();let query=client.from("change_requests").select("*").eq("id",id);
 if(!platform)query=query.eq("tenant_id",context.tenantId??"");
 const result=await query.maybeSingle();if(result.error||!result.data)notFound();const request=result.data;
 const messages=await client.from("messages").select("*").eq("request_id",id).eq("tenant_id",request.tenant_id).order("created_at").order("id");
 if(messages.error)throw new Error("Не удалось загрузить диалог.");
 const status={new:"Новое",in_progress:"В работе",done:"Решено"}[request.status];
 return <section className="mx-auto max-w-3xl space-y-5"><Link href={platform?"/root":"/admin/requests"} className="text-sm underline">← История обращений</Link>
 <header><h1 className="text-2xl font-bold">{request.subject}</h1><p className="mt-2 text-sm text-neutral-500">{status} · {new Date(request.created_at).toLocaleString("ru-RU")}</p></header>
 <div className="rounded-2xl border p-5"><p className="text-xs text-neutral-500">Исходный запрос</p><p className="mt-2 whitespace-pre-wrap break-words">{request.text}</p></div>
 <div aria-label="История диалога" className="space-y-4">{messages.data.map(m=><article key={m.id} className={`rounded-xl border p-4 ${m.from_role==="owner"?"ml-5 bg-neutral-100":"mr-5 bg-white"}`}><p className="text-xs text-neutral-500">{m.from_role==="owner"?"Владелец магазина":"Поддержка Dukenim"} · {new Date(m.created_at).toLocaleString("ru-RU")}</p><p className="mt-2 whitespace-pre-wrap break-words text-neutral-900">{m.text}</p></article>)}</div>
 <SupportReply requestId={id}/><p className="text-xs text-neutral-500">Ответы автоматически обновляются, пока эта страница открыта.</p></section>;
}
