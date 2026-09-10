import {StaffDesigns} from "./designs";
import Link from "next/link";
import {redirect} from "next/navigation";
import {createStaffClient} from "@/lib/staff-server";
import {staffCan,staffModules} from "@/lib/staff-permissions";
import {orderStatusLabels,type OrderStatus} from "@/lib/order-display";
import {StaffOrderControl} from "./order-control";
import {z} from "zod";
import {ModuleRecord} from "./module-record";
import {StudioConversation} from "@/components/admin/studio-conversation";
import {LiveOrders} from "@/components/admin/live-orders";
import {StaffProductCreate} from "./product-create";
export const dynamic="force-dynamic";
const ordersSchema=z.array(z.object({id:z.string(),order_number:z.number().nullable(),status:z.enum(["new","confirmed","assembled","delivering","done","cancelled"]),total:z.number(),delivery_method:z.string().nullable()}));
export default async function StaffPage(){
 const client=await createStaffClient();const{data:{user}}=await client.auth.getUser();if(!user)redirect("/login");
 const memberships=await client.from("staff_access").select("*").eq("user_id",user.id).eq("active",true);
 const directory=await client.rpc("staff_directory",{});const names=z.array(z.object({id:z.string(),name:z.string()})).safeParse(directory.data);
 return <main className="mx-auto max-w-4xl space-y-6 p-5"><header><h1 className="text-3xl font-semibold">Рабочий кабинет</h1><p className="mt-2 text-neutral-500">Только магазины и действия, к которым владелец предоставил доступ.</p></header><LiveOrders/>
 {memberships.error?<p role="alert">Не удалось проверить доступ. Данные магазина не загружены.</p>:!memberships.data?.length?<p>Активного доступа нет. Попросите владельца пригласить вас по email.</p>:await Promise.all(memberships.data.map(async member=>{
  const canRead=staffCan(member.permissions,"orders","read");const result=canRead?await client.rpc("staff_orders",{p_access:member.id}):null;
  const orders=ordersSchema.safeParse(result?.data);
  return <section key={member.id} className="space-y-4 rounded-2xl border bg-neutral-50 p-5"><h2 className="text-xl font-semibold">{names.success?names.data.find(row=>row.id===member.id)?.name:"Магазин"} · {member.title}</h2><p className="text-sm">Ваши разрешения: {Object.entries(staffModules).filter(([key])=>staffCan(member.permissions,key as keyof typeof staffModules,"read")).map(([,label])=>label).join(", ")||"пока не назначены"}.</p>
  {staffCan(member.permissions,"catalog","write")&&<StaffProductCreate access={member.id} stock={staffCan(member.permissions,"stock","write")}/>}
  {canRead&&<><h3 className="text-lg font-semibold">Заказы</h3>{result?.error?<p role="alert">Доступ изменён или заказы недоступны.</p>:orders.success&&orders.data.length?orders.data.map(order=><article key={order.id} className="rounded-xl border bg-white p-4"><p className="font-semibold">Заказ №{order.order_number??"—"} · {order.total.toLocaleString("ru-RU")} ₸</p><p>{orderStatusLabels[order.status as OrderStatus]} · {order.delivery_method}</p>{staffCan(member.permissions,"orders","write")&&<StaffOrderControl access={member.id} id={order.id} status={order.status}/>}</article>):<p>Заказов пока нет.</p>}</>}
  {await Promise.all((["catalog","stock","customers","analytics"] as const).filter(module=>staffCan(member.permissions,module,"read")).map(async module=>{const result=await client.rpc("staff_module_data",{p_access:member.id,p_module:module});return <details key={module} className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">{staffModules[module]}</summary><div className="mt-4 space-y-3">{result.error?<p>Раздел недоступен. Обновите права.</p>:Array.isArray(result.data)&&result.data.length?result.data.map((record,index)=>record&&typeof record==="object"&&!Array.isArray(record)?<ModuleRecord key={index} access={member.id} module={module} record={record} write={staffCan(member.permissions,module,"write")}/>:null):<p>Пока нет записей.</p>}</div></details>;}))}
  {staffCan(member.permissions,"studio","read")&&<details className="rounded-xl border p-4"><summary className="font-semibold">AI Studio</summary><StudioConversation staff enabled={staffCan(member.permissions,"studio","write")} endpoint={`/api/staff/studio?access=${member.id}`} stageHint="Помогу подготовить тексты и предложения. Сохранённое оформление можно проверить и применить ниже при наличии права изменения."/><StaffDesigns access={member.id}/></details>}
  </section>;
 }))}<Link href="/login" className="inline-block underline">Войти под другим аккаунтом</Link></main>;
}
