import {CashPayment} from "./cash-payment";
import {KaspiPayment} from "./kaspi-payment";
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
import {deliveryProviderFromSnapshot} from "@/lib/delivery-provider";

export default async function Orders(){
  const {tenantId}=await requireRole(["owner","superadmin"]);
  const orders=await loadOwnerOrders(tenantId!);
  const client=await createClient();
  const admin=process.env.SUPABASE_SERVICE_ROLE_KEY?createAdminClient():null;
  const orderIds=orders.map(order=>order.id);
  const customerIds=[...new Set(orders.map(order=>order.customer_id).filter((id):id is string=>Boolean(id)))];
  const [customerRows,kitchen,holds,loyalty,connection]=await Promise.all([
    customerIds.length?client.from("customers").select("id,name,phone").eq("tenant_id",tenantId!).in("id",customerIds):Promise.resolve(null),
    orderIds.length?client.from("order_items").select("order_id,title_snapshot,qty,options_snapshot,combo_parent").eq("tenant_id",tenantId!).in("order_id",orderIds):Promise.resolve(null),
    reservationsClient(client).from("merchandise_reservations").select("*").eq("tenant_id",tenantId!).order("created_at",{ascending:false}).limit(100),
    admin&&orderIds.length?loyaltyClient(admin).from("buyer_order_access").select("order_id,discount,reward_label").eq("tenant_id",tenantId!).in("order_id",orderIds):Promise.resolve(null),
    admin?admin.from("integration_connections").select("id").eq("tenant_id",tenantId!).eq("provider","planfix").eq("status","active").maybeSingle():Promise.resolve(null),
  ]);
  const customers=new Map((customerRows?.data??[]).map(customer=>[customer.id,customer]));
  const byId=new Map((holds.data??[]).map(hold=>[hold.order_id,hold]));
  const benefits=new Map((loyalty?.data??[]).map(row=>[row.order_id,row]));
  type KitchenItem=NonNullable<NonNullable<typeof kitchen>["data"]>[number];
  const itemsByOrder=new Map<string,KitchenItem[]>();
  for(const item of kitchen?.data??[])itemsByOrder.set(item.order_id,[...(itemsByOrder.get(item.order_id)??[]),item]);
  const planfixConnected=Boolean(connection?.data);
  const planfixStates=new Map<string,string>();
  if(admin&&connection?.data){
      const links=await admin.from("integration_entity_links").select("entity_id,status").eq("tenant_id",tenantId!).eq("provider","planfix").eq("entity_type","order");
      for(const link of links.data??[])planfixStates.set(link.entity_id,link.status);
  }
  return <>
    <h1 className="text-3xl font-semibold">Заказы и бронирования</h1>
    <p className="muted mt-2">Бронь становится продажей только после выдачи и получения оплаты.</p>
    <LiveOrders/>
    {holds.error&&<p role="alert">Состояния брони не загрузились. Управление заказами временно скрыто.</p>}
    <div className="mt-6 grid gap-4">{orders.map(order=>{
      const hold=byId.get(order.id); const benefit=benefits.get(order.id);const customer=order.customer_id?customers.get(order.customer_id):null;
      const yandexDelivery=order.delivery_method==="courier"&&deliveryProviderFromSnapshot(order.fulfilment_snapshot)==="yandex";
      return <article key={order.id} className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          {benefit?.reward_label&&<p className="mb-2 rounded-xl bg-purple-50 p-3 text-sm font-semibold">Награда гостю: {benefit.reward_label}{benefit.discount>0?` · скидка ${money(benefit.discount)}`:" · выдайте вместе с заказом"}</p>}<b>{hold?"Бронь":"Заказ"} #{order.order_number}</b>
          <p className="muted mt-1 text-sm">Создан: {new Date(order.created_at).toLocaleString("ru-KZ")}</p>
          {customer&&<p className="mt-2 text-sm"><b>Покупатель:</b> {customer.name||"Имя не указано"} · <a className="font-semibold underline" href={`tel:${customer.phone.replace(/[^+\d]/g,"")}`}>{customer.phone}</a></p>}
          {order.delivery_method==="courier"&&<div className="mt-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-950"><b>{yandexDelivery?"Курьер через Яндекс · оформите вручную":"Своя доставка"}</b><p><b>Адрес от покупателя:</b> {order.delivery_address||"уточните у покупателя"}</p>{yandexDelivery?<><p>Свяжитесь с покупателем, проверьте адрес и телефон, согласуйте цену по расстоянию. После согласования сами закажите курьера от двери до двери и выберите доступный способ оплаты. Стоимость курьера не входит в сумму товаров и не рассчитана Dukenim.</p></>:<p>Цена для покупателя: {money(order.delivery_cost)} · оплата при получении</p>}</div>}
          {!hold&&<p className="mt-2 text-sm font-semibold">{order.requested_for?`Ко времени: ${new Date(order.requested_for).toLocaleString("ru-KZ")}`:"Как можно скорее"}</p>}
          {!hold&&order.payment_method==="kaspi"&&order.status!=="cancelled"&&<KaspiPayment orderId={order.id} paid={order.payment_status==="paid"} refunded={order.payment_status==="refunded"} invoiceSent={Boolean(order.kaspi_invoice_sent_at)} total={order.total}/>}
          {!hold&&order.payment_method==="cash"&&["pending","paid"].includes(order.payment_status)&&order.status!=="cancelled"&&<CashPayment orderId={order.id} paid={order.payment_status==="paid"}/>}<div className="mt-4 space-y-2">{itemsByOrder.get(order.id)?.map((item,index)=><div key={index} className="rounded-xl bg-neutral-50 p-3 text-sm"><b>{item.title_snapshot} × {item.qty}</b>{item.combo_parent&&<small className="ml-2 text-neutral-500">В комбо</small>}{Array.isArray(item.options_snapshot)&&item.options_snapshot.map((label,i)=><p key={i} className="mt-1 text-xs text-purple-700">{String(label)}</p>)}</div>)}</div>{planfixConnected&&!hold&&<PlanfixOrderSyncButton orderId={order.id} status={planfixStates.get(order.id)}/>}
        </div>
        <span className="badge">{hold?"В магазине":order.source==="online"?"Онлайн":"В зале"}</span>
        <strong>{yandexDelivery?"Товары: ":""}{money(order.total)}</strong>
        {!holds.error&&(hold?<ReservationControls key={hold.status} reservation={hold}/>:<OrderStatusForm key={`${order.id}-${order.status}`} id={order.id} status={order.status}/>)}
      </article>;
    })}</div>
  </>;
}
