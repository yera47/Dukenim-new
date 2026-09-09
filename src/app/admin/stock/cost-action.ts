"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
export async function saveUnitCost(_: {error?:string;success?:string},form:FormData):Promise<{error?:string;success?:string}> {
  const context=await requireRole(["owner","superadmin"]);
  if(!context.user||!context.tenantId)return {error:"Войдите как владелец магазина."};
  const raw=String(form.get("unitCost")??"").trim();
  const parsed=z.object({variantId:z.string().uuid(),unitCost:z.number().int().min(0).max(2000000000).nullable()}).safeParse({variantId:form.get("variantId"),unitCost:raw===""?null:Number(raw)});
  if(!parsed.success)return {error:"Введите целую себестоимость в тенге. Пустое поле означает «неизвестна»."};
  const client=await createClient();
  const variant=await client.from("product_variants").select("id").eq("id",parsed.data.variantId).eq("tenant_id",context.tenantId).maybeSingle();
  if(variant.error||!variant.data)return {error:"Вариант не найден в вашем магазине."};
  const saved=await client.from("variant_costs").upsert({tenant_id:context.tenantId,variant_id:parsed.data.variantId,unit_cost:parsed.data.unitCost,updated_at:new Date().toISOString()},{onConflict:"variant_id"}).select("variant_id").maybeSingle();
  if(saved.error||!saved.data)return {error:"Себестоимость не сохранена. Повторите попытку."};
  revalidatePath("/admin/stock");
  return {success:"Сохранено. Прошлые заказы не изменены."};
}
