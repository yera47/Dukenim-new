"use server";
import {z} from "zod";
import {revalidatePath} from "next/cache";
import {createStaffClient} from "@/lib/staff-server";
const status=z.enum(["new","confirmed","assembled","delivering","done","cancelled"]);
export async function applyStaffDesign(_: {error?:string;success?:string},form:FormData):Promise<{error?:string;success?:string}>{
 const input=z.object({p_access:z.string().uuid(),p_generation:z.string().uuid(),p_expected:z.string().datetime({offset:true})}).safeParse(Object.fromEntries(form));
 if(!input.success)return{error:"Обновите предложение."};
 const client=await createStaffClient();const result=await client.rpc("staff_apply_design",input.data);
 if(result.error)return{error:"Не сохранено: права или оформление изменились. Обновите страницу и предпросмотр."};
 revalidatePath("/staff");revalidatePath("/admin/ai-studio");revalidatePath("/s/[slug]","page");return{success:"Оформление применено. Статус публикации магазина не изменён."};
}
export async function editStaffRecord(_: {error?:string;success?:string},form:FormData):Promise<{error?:string;success?:string}>{
 const input=z.object({access:z.string().uuid(),module:z.enum(["catalog","stock","customers"]),id:z.string().uuid()}).safeParse({access:form.get("access"),module:form.get("module"),id:form.get("id")});
 if(!input.success)return {error:"Обновите страницу."};
 const data=Object.fromEntries([...form.entries()].filter(([key])=>!["access","module","id"].includes(key)).map(([key,value])=>[key,String(value)]));
 if(input.data.module==="catalog")data.active=form.get("active")==="on"?"true":"false";
 const client=await createStaffClient();const result=await client.rpc("staff_edit",{p_access:input.data.access,p_module:input.data.module,p_id:input.data.id,p_data:data});
 if(result.error)return {error:"Не сохранено. Проверьте поля и права; запись могла измениться. Обновите страницу."};
 revalidatePath("/staff");revalidatePath("/admin", "layout");return {success:"Сохранено."};
}
export async function updateStaffOrder(_: {error?:string;success?:string},form:FormData):Promise<{error?:string;success?:string}>{
 const parsed=z.object({p_access:z.string().uuid(),p_order:z.string().uuid(),p_expected:status,p_status:status}).safeParse(Object.fromEntries(form));
 if(!parsed.success)return {error:"Обновите страницу."};
 const client=await createStaffClient();const result=await client.rpc("staff_order_status",parsed.data);
 if(result.error)return {error:"Статус не сохранён: проверьте права, актуальность заказа и необходимость возврата оплаты."};
 revalidatePath("/staff");revalidatePath("/admin/orders");return {success:"Статус сохранён."};
}
