"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
export async function publishCatalog():Promise<{error?:string;success?:boolean}>{
 const session=await requireRole(["owner","superadmin"]);
 if(!session.tenantId)return{error:"Откройте магазин владельца."};
 const {data,error}=await (await createClient()).rpc("publish_catalog",{p_tenant_id:session.tenantId});
 if(error||!data)return{error:"Проверьте: есть активный товар с остатком, адрес самовывоза или зона доставки и действующий тариф."};
 revalidatePath("/admin/ai-studio");revalidatePath("/s/[slug]","layout");
 return{success:true};
}
