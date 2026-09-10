import {requireRole} from "@/lib/auth";
import {loadOwnerOrders} from "@/lib/owner-data";
import {money} from "@/lib/demo-data";
import {OrderStatusForm} from "./status-form";
import {ReservationControls} from "./reservation-controls";
import {reservationsClient} from "@/lib/reservations";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {PlanfixOrderSyncButton} from "./planfix-sync-button";
import {LiveOrders} from "@/components/admin/live-orders";
export default async function Orders(){
 const {tenantId}=await requireRole(["owner","superadmin"]);
 const orders=await loadOwnerOrders(tenantId!);
 const holds=await reservationsClient(await createClient()).from("merchandise_reservations").select("*").eq("tenant_id",tenantId!).order("created_at",{ascending:false}).limit(100);
 const byId=new Map((holds.data??[]).map(hold=>[hold.order_id,hold]));
 let planfixConnected=false;const planfixStates=new Map<string,string>();
 if(process.env.SUPABASE_SERVICE_ROLE_KEY&&tenantId){const admin=createAdminClient();const connection=await admin.from("integration_connections").select("id").eq("tenant_id",tenantId).eq("provider","planfix").eq("status","active").maybeSingle();planfixConnected=Boolean(connection.data);if(connection.data){const links=await admin.from("integration_entity_links").select("entity_id,status").eq("tenant_id",tenantId).eq("provider","planfix").eq("entity_type","order");for(const link of links.data??[])planfixStates.set(link.entity_id,link.status);}}
 return <><h1 className="text-3xl font-semibold">Заказы и бронирования</h1><p className="muted mt-2">Бронь становится продажей только после выдачи и получения оплаты.</p><LiveOrders/>{holds.error&&<p role="alert">Состояния брони не загрузились. Управление заказами временно скрыто.</p>}<div className="mt-6 grid gap-4">{orders.map(o=>{const hold=byId.get(o.id);return <article key={o.id} className="card flex flex-wrap items-start justify-between gap-4 p-5"><div><b>{hold?'Бронь':'Заказ'} #{o.order_number}</b><p className="muted mt-1 text-sm">{new Date(o.created_at).toLocaleString("ru-KZ")}</p>{planfixConnected&&!hold&&<PlanfixOrderSyncButton orderId={o.id} status={planfixStates.get(o.id)}/>}</div><span className="badge">{hold?'В магазине':o.source==="online"?"Онлайн":"В зале"}</span><strong>{money(o.total)}</strong>{!holds.error&&(hold?<ReservationControls key={hold.status} reservation={hold}/>:<OrderStatusForm key={`${o.id}-${o.status}`} id={o.id} status={o.status}/>)}</article>})}</div></>;
}
