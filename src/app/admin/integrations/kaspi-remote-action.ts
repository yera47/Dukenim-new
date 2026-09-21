"use server";
import {revalidatePath} from "next/cache";
import {getSessionContext} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {kaspiRemoteUrl} from "@/lib/kaspi-remote";

export type KaspiSettingsState={error?:string;success?:string};
export async function saveKaspiRemoteSettings(_:KaspiSettingsState,form:FormData):Promise<KaspiSettingsState>{
 const context=await getSessionContext();
 if(!context?.user||!context.tenantId||context.role!=="owner")return{error:"Войдите как владелец магазина."};
 const enabled=form.get("enabled")==="on";
 const raw=String(form.get("link")??"").trim();
 const link=raw?kaspiRemoteUrl(raw):null;
 if(raw&&!link)return{error:"Вставьте ссылку на удалённую оплату из Kaspi Pay (адрес kaspi.kz)."};
 try{
  const client=await createClient();
  const result=await client.from("tenant_settings").update({kaspi_remote_enabled:enabled,kaspi_remote_link:link}).eq("tenant_id",context.tenantId).select("tenant_id").maybeSingle();
  if(result.error||!result.data)return{error:"Настройка не сохранена. Обновите страницу и повторите."};
  revalidatePath("/admin/integrations");revalidatePath("/s/[slug]/checkout","page");
  return{success:enabled?"Удалённая оплата Kaspi доступна покупателям. Поступление денег подтверждайте после проверки в Kaspi Pay.":"Удалённая оплата Kaspi отключена для новых заказов."};
 }catch{return{error:"Нет связи. Проверьте настройку после обновления страницы."};}
}
