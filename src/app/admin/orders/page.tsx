import {CashPayment} from "./cash-payment";
import {loyaltyClient} from "@/lib/loyalty-db";
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
  const kitchen=await (await createClient()).from("order_items").select("order_id,title_snapshot,qty,options_snapshot,combo_parent").eq("tenant_id",tenantId!).in("order_id",orders.map(o=>o.id));
  const holds=await reservationsClient(await createClient()).from("merchandise_reservations").select("*").eq("tenant_id",tenantId!).order("created_at",{ascending:false}).limit(100);
  const loyalty=await loyaltyClient(createAdminClient()).from("buyer_order_access").select("order_id,discount,reward_label").eq("tenant_id",tenantId!).in("order_id",orders.map(o=>o.id));
  const byId=new Map((holds.data??[]).map(hold=>[hold.order_id,hold]));
  let planfixConnected=false;
  const planfixStates=new Map<string,string>();
  if(process.env.SUPABASE_SERVICE_ROLE_KEY&&tenantId){
    const admin=createAdminClient();
    const connection=await admin.from("integration_connections").select("id").eq("tenant_id",tenantId).eq("provider","planfix").eq("status","active").maybeSingle();
    planfixConnected=Boolean(connection.data);
    if(connection.data){
      const links=await admin.from("integration_entity_links").select("entity_id,status").eq("tenant_id",tenantId).eq("provider","planfix").eq("entity_type","order");
      for(const link of links.data??[])planfixStates.set(link.entity_id,link.status);
    }
  }
  return <>
    <h1 className="text-3xl font-semibold">Заказы и бронирования</h1>
    <p className="muted mt-2">Бронь становится продажей только после выдачи и получения оплаты.</p>
    <LiveOrders/>
    {holds.error&&<p role="alert">Состояния брони не загрузились. Управление заказами временно скрыто.</p>}
    <div className="mt-6 grid gap-4">{orders.map(order=>{
      const hold=byId.get(order.id); const benefit=loyalty.data?.find(row=>row.order_id===order.id);
      return <article key={order.id} className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          {benefit?.reward_label&&<p className="mb-2 rounded-xl bg-purple-50 p-3 text-sm font-semibold">Награда гостю: {benefit.reward_label}{benefit.discount>0?` · скидка ${money(benefit.discount)}`:" · выдайте вместе с заказом"}</p>}<b>{hold?"Бронь":"Заказ"} #{order.order_number}</b>
          <p className="muted mt-1 text-sm">Создан: {new Date(order.created_at).toLocaleString("ru-KZ")}</p>
          {!hold&&<p className="mt-2 text-sm font-semibold">{order.requested_for?`Ко времени: ${new Date(order.requested_for).toLocaleString("ru-KZ")}`:"Как можно скорее"}</p>}
          {!hold&&order.payment_method==="cash"&&["pending","paid"].includes(order.payment_status)&&order.status!=="cancelled"&&<CashPayment orderId={order.id} paid={order.payment_status==="paid"}/>}<div className="mt-4 space-y-2">{kitchen.data?.filter(i=>i.order_id===order.id).map((item,index)=><div key={index} className="rounded-xl bg-neutral-50 p-3 text-sm"><b>{item.title_snapshot} × {item.qty}</b>{item.combo_parent&&<small className="ml-2 text-neutral-500">В комбо</small>}{Array.isArray(item.options_snapshot)&&item.options_snapshot.map((label,i)=><p key={i} className="mt-1 text-xs text-purple-700">{String(label)}</p>)}</div>)}</div>{planfixConnected&&!hold&&<PlanfixOrderSyncButton orderId={order.id} status={planfixStates.get(order.id)}/>}
        </div>
        <span className="badge">{hold?"В магазине":order.source==="online"?"Онлайн":"В зале"}</span>
        <strong>{money(order.total)}</strong>
        {!holds.error&&(hold?<ReservationControls key={hold.status} reservation={hold}/>:<OrderStatusForm key={`${order.id}-${order.status}`} id={order.id} status={order.status}/>)}
      </article>;
    })}</div>
  </>;
}
