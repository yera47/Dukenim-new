import {NextResponse} from "next/server";
import {z} from "zod";
import {createStaffClient,createStaffAdminClient} from "@/lib/staff-server";
import {staffCan} from "@/lib/staff-permissions";
import {computeEntitlement} from "@/lib/entitlement";
import {createConsultation} from "@/lib/ai/consultation";
import {consultationSchema,type ConsultationTurn} from "@/lib/ai/consultation-schema";
import {getAiStudioStatus} from "@/lib/ai/studio";
async function authorize(request:Request,operation:"read"|"write"){
 const id=new URL(request.url).searchParams.get("access");if(!z.string().uuid().safeParse(id).success)return null;
 const client=await createStaffClient();const{data:{user}}=await client.auth.getUser();if(!user)return null;
 const {data:member,error}=await client.from("staff_access").select("*").eq("id",id!).eq("user_id",user.id).eq("active",true).maybeSingle();
 if(error||!member||!staffCan(member.permissions,"studio",operation))return null;
 const admin=createStaffAdminClient();const{data:tenant}=await admin.from("tenants").select("id,name,business_vertical,catalog_status,plan,next_plan,status,trial_ends_at").eq("id",member.tenant_id).maybeSingle();
 if(!tenant)return null;const entitlement=computeEntitlement(tenant);if(!entitlement.active||entitlement.plan==="basic")return null;
 return {admin,member,user,tenant};
}
const headers={"Cache-Control":"private, no-store"};
export async function GET(request:Request){
 const context=await authorize(request,"read");if(!context)return NextResponse.json({error:"Нет доступа к AI Studio этого магазина."},{status:403,headers});
 const result=await context.admin.from("ai_studio_generations").select("id,input_summary,output").eq("tenant_id",context.member.tenant_id).eq("intent","consultation").order("created_at",{ascending:false}).limit(30);
 if(result.error)return NextResponse.json({error:"История временно недоступна."},{status:503,headers});
 const turns:ConsultationTurn[]=[];for(const row of (result.data??[]).reverse()){const parsed=consultationSchema.safeParse(row.output);if(parsed.success)turns.push({id:row.id,message:row.input_summary,response:parsed.data});}
 return NextResponse.json({turns},{headers});
}
export async function POST(request:Request){
 if(request.headers.get("origin")!==new URL(request.url).origin)return NextResponse.json({error:"Недопустимый источник."},{status:403,headers});
 const context=await authorize(request,"write");if(!context)return NextResponse.json({error:"Нет права писать в AI Studio."},{status:403,headers});
 const raw=await request.text();if(raw.length>10000)return NextResponse.json({error:"Слишком длинное сообщение."},{status:413,headers});
 let input;try{input=z.object({brief:z.string().trim().min(2).max(800)}).parse(JSON.parse(raw));}catch{return NextResponse.json({error:"Введите сообщение от 2 до 800 символов."},{status:400,headers});}
 if(!getAiStudioStatus().configured)return NextResponse.json({error:"AI временно недоступен."},{status:503,headers});
 const recent=await context.admin.from("ai_studio_generations").select("id,input_summary,output").eq("tenant_id",context.member.tenant_id).eq("intent","consultation").order("created_at",{ascending:false}).limit(12);
 if(recent.error)return NextResponse.json({error:"Не удалось восстановить контекст."},{status:503,headers});
 const history:ConsultationTurn[]=[];for(const row of (recent.data??[]).reverse()){const parsed=consultationSchema.safeParse(row.output);if(parsed.success)history.push({id:row.id,message:row.input_summary,response:parsed.data});}
 const rpc=context.admin as unknown as {rpc:(name:string,args:Record<string,unknown>)=>Promise<{error:unknown}>};
 const reserved=await rpc.rpc("reserve_ai_credits",{p_tenant_id:context.member.tenant_id,p_cost:1,p_monthly_allotment:120});
 if(reserved.error)return NextResponse.json({error:"Лимит AI недоступен. Обратитесь к владельцу."},{status:429,headers});
 try{
  const result=await createConsultation(input.brief,{...context.tenant,actor:"Сотрудник: готовит предложения, не публикует магазин",permissions:context.member.permissions},history);
  if(!await authorize(request,"write"))throw new Error("Access revoked");
  const saved=await context.admin.from("ai_studio_generations").insert({tenant_id:context.member.tenant_id,requested_by:context.user.id,intent:"consultation",input_summary:input.brief,output:result.consultation,model:getAiStudioStatus().deployment,usage:result.usage??{},credit_cost:1}).select("id").single();
  if(saved.error||!saved.data)throw new Error("Save failed");
  return NextResponse.json({consultation:result.consultation,generationId:saved.data.id},{headers});
 }catch{const refund=await rpc.rpc("refund_ai_credits",{p_tenant_id:context.member.tenant_id,p_cost:1});return NextResponse.json({error:refund.error?"Ответ не сохранён; возврат лимита требует проверки поддержки.":"Ответ не сохранён. Лимит возвращён; проверьте доступ и повторите позже."},{status:503,headers});}
}
