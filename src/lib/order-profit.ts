import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database} from "@/types/database";
import {salesPeriod} from "./order-analytics";
export type CostLine={unit_cost:number|null;unit_price:number;qty:number};
export function grossProfit(lines:CostLine[],expectedLines:number):number|null {
  if(!lines.length||lines.length!==expectedLines||lines.some(l=>l.unit_cost===null))return null;
  let total=0;
  for(const line of lines){
    if(!Number.isSafeInteger(line.qty)||line.qty<1||!Number.isSafeInteger(line.unit_price)||line.unit_price<0||!Number.isSafeInteger(line.unit_cost)||line.unit_cost!<0)throw Error("Invalid cost snapshot");
    total+=(line.unit_price-line.unit_cost!)*line.qty;
    if(!Number.isSafeInteger(total))throw Error("Profit overflow");
  }
  return total;
}

export async function loadGrossProfit(client:SupabaseClient<Database>,tenantId:string,period:ReturnType<typeof salesPeriod>) {
  const orders=await client.from("orders").select("id").eq("tenant_id",tenantId).eq("payment_status","paid").neq("status","cancelled").gte("created_at",period.start).lte("created_at",period.end).limit(1001);
  if(orders.error||!orders.data||orders.data.length>1000)throw Error("Report unavailable");
  if(!orders.data.length)return null;
  const ids=orders.data.map(o=>o.id);
  // Use small batches and exact counts: API row limits must never produce partial profit.
  const lines:CostLine[]=[];let expected=0;
  for(let i=0;i<ids.length;i+=20){
    const batch=ids.slice(i,i+20);
    const [items,costs]=await Promise.all([
      client.from("order_items").select("id",{count:"exact",head:true}).eq("tenant_id",tenantId).in("order_id",batch),
      client.from("order_item_costs").select("unit_cost,unit_price,qty",{count:"exact"}).eq("tenant_id",tenantId).in("order_id",batch).limit(1000),
    ]);
    if(items.error||costs.error||items.count===null||costs.count===null||!costs.data||costs.count!==costs.data.length)throw Error("Incomplete cost report");
    expected+=items.count;lines.push(...costs.data);
  }
  return grossProfit(lines,expected);
}
