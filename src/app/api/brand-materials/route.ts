import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { tenantEntitlement } from "@/lib/plan-access";
import { brandNotesSchema } from "@/lib/brand-materials";
import { prepareBrandLogo } from "@/lib/brand-image";
export const runtime="nodejs";
const fail=(error:string,status:number)=>NextResponse.json({error},{status});
export async function GET() {
  const session=await getSessionContext();
  if(!session?.user||!session.tenantId||session.role!=="owner")return fail("Нужен аккаунт владельца магазина.",401);
  const client=await createClient();
  const result=await client.from("tenant_brand_materials").select("revision,notes,logo_path,colors").eq("tenant_id",session.tenantId).maybeSingle();
  if(result.error)return fail("Материалы не загрузились.",503);
  let logoUrl:string|null=null;
  if(result.data?.logo_path?.startsWith(`${session.tenantId}/`)) {
    const signed=await client.storage.from("brand-materials").createSignedUrl(result.data.logo_path,600);
    if(signed.error)return fail("Не удалось загрузить логотип.",503);
    logoUrl=signed.data.signedUrl;
  }
  return NextResponse.json({revision:result.data?.revision??0,notes:result.data?.notes??"",colors:result.data?.colors??[],logoUrl},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request:Request) {
  try {
    const session=await getSessionContext();
    if(!session?.user||!session.tenantId||session.role!=="owner")return fail("Нужен аккаунт владельца магазина.",401);
    if(!(await tenantEntitlement(session.tenantId)).active)return fail("Подписка или пробный период завершены.",403);
    const reader=request.body?.getReader();
    if(!reader)return fail("Нет данных для сохранения.",400);
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
      if(size>4*1024*1024){await reader.cancel();return fail("Файл слишком большой. Максимум 3 МБ.",413);}chunks.push(value);
    }
    const bytes=Buffer.concat(chunks);
    const form=await new Request(request.url,{method:"POST",headers:{"Content-Type":request.headers.get("content-type")??""},body:bytes}).formData();
    const input=brandNotesSchema.safeParse({revision:Number(form.get("revision")),notes:String(form.get("notes")??"")});
    if(!input.success||form.get("revision")===null)return fail("Проверьте текст правил и обновите страницу.",400);
    const client=await createClient();
    const current=await client.from("tenant_brand_materials").select("revision,logo_path,colors").eq("tenant_id",session.tenantId).maybeSingle();
    if(current.error)return fail("Не удалось прочитать сохранённые материалы.",503);
    if((current.data?.revision??0)!==input.data.revision)return fail("Материалы изменены в другой вкладке. Скопируйте свой текст и обновите страницу.",409);
    let logoPath=current.data?.logo_path??null;
    let colors=current.data?.colors??[];
    const file=form.get("logo");
    if(file instanceof File&&file.size) {
      if(file.size>3*1024*1024)return fail("Логотип должен быть меньше 3 МБ.",413);
      let prepared;
      try { prepared=await prepareBrandLogo(Buffer.from(await file.arrayBuffer())); } catch { return fail("Не удалось прочитать изображение. Используйте PNG, JPEG или WebP до 16 мегапикселей.",400); }
      logoPath=`${session.tenantId}/${crypto.randomUUID()}.png`;
      const uploaded=await client.storage.from("brand-materials").upload(logoPath,prepared.png,{contentType:"image/png",upsert:false});
      if(uploaded.error)return fail("Логотип не загрузился. Текст остался на экране.",503);
      colors=prepared.colors;
    }
    const value={notes:input.data.notes,logo_path:logoPath,colors,revision:input.data.revision+1,updated_at:new Date().toISOString()};
    const saved=input.data.revision===0
      ? await client.from("tenant_brand_materials").insert({tenant_id:session.tenantId,...value}).select("revision").single()
      : await client.from("tenant_brand_materials").update(value).eq("tenant_id",session.tenantId).eq("revision",input.data.revision).select("revision").maybeSingle();
    if(saved.error||!saved.data)return fail("Изменение не подтверждено. Скопируйте текст и обновите страницу перед повтором.",409);
    return NextResponse.json({revision:saved.data.revision,colors});
  } catch { return fail("Не удалось сохранить материалы. Ваши изменения остаются на экране.",503); }
}
