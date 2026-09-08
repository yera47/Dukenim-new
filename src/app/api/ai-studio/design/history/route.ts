import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const context=await getSessionContext();
  if(!context?.user||context.role!=="owner"||!context.tenantId) return NextResponse.json({error:"Нужен вход владельца."},{status:401});
  const result=await (await createClient()).rpc("read_storefront_design_history",{p_tenant_id:context.tenantId});
  if(result.error)return NextResponse.json({error:"История недоступна."},{status:503});
  return NextResponse.json({history:result.data},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request:Request) {
  const context=await getSessionContext();
  if(!context?.user||context.role!=="owner"||!context.tenantId)return NextResponse.json({error:"Нужен вход владельца."},{status:401});
  const input=z.object({historyId:z.string().uuid()}).strict().safeParse(await request.json().catch(()=>null));
  if(!input.success)return NextResponse.json({error:"Выберите последнее изменение."},{status:400});
  const result=await (await createClient()).rpc("undo_storefront_design",{p_tenant_id:context.tenantId,p_history_id:input.data.historyId});
  if(result.error||result.data!==true)return NextResponse.json({error:"Отмена не выполнена: оформление изменилось или недоступно на текущем тарифе. Обновите историю."},{status:409});
  revalidatePath("/s/[slug]","layout");revalidatePath("/admin/settings");revalidatePath("/store-preview");
  return NextResponse.json({saved:true});
}
