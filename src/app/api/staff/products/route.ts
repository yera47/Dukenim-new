import {NextResponse} from "next/server";
import sharp from "sharp";
import {createStaffClient,createStaffAdminClient} from "@/lib/staff-server";
import {staffCan} from "@/lib/staff-permissions";
import {staffProductSchema} from "@/lib/staff-product";
import {revalidatePath} from "next/cache";
export const runtime="nodejs";
const fail=(error:string,status:number)=>NextResponse.json({error},{status});
export async function POST(request:Request){
 if(request.headers.get("origin")!==new URL(request.url).origin)return fail("Недопустимый источник",403);
 const client=await createStaffClient();const {data:{user}}=await client.auth.getUser();if(!user)return fail("Войдите в аккаунт сотрудника",401);
 if(Number(request.headers.get("content-length"))>3500000)return fail("Файлы слишком большие",413);
 let form:FormData;try{form=await request.formData();}catch{return fail("Не удалось прочитать форму",400);}
 const input=staffProductSchema.safeParse(Object.fromEntries(form));if(!input.success)return fail("Проверьте название, цену и остаток",400);
 const {data:member,error}=await client.from("staff_access").select("*").eq("id",input.data.access).eq("user_id",user.id).eq("active",true).maybeSingle();
 if(error||!member||!staffCan(member.permissions,"catalog","write")||(input.data.stock>0&&!staffCan(member.permissions,"stock","write")))return fail("Недостаточно прав",403);
 const files=form.getAll("images").filter((value):value is File=>value instanceof File&&value.size>0);
 if(files.length>4||files.reduce((sum,file)=>sum+file.size,0)>3000000)return fail("До 4 фотографий, суммарно до 3 МБ",400);
 const admin=createStaffAdminClient();const paths:string[]=[],images:string[]=[];let saveStarted=false;
 try{
  const tenant=await admin.from("tenants").select("status,trial_ends_at,catalog_status").eq("id",member.tenant_id).single();
  if(!tenant.data||tenant.data.catalog_status==="not_started"||!(tenant.data.status==="active"||(tenant.data.status==="trial"&&Date.parse(tenant.data.trial_ends_at??"")>Date.now())))return fail("Сначала создайте каталог и проверьте тариф",403);
  const existing=await admin.from("products").select("id").eq("id",input.data.request).eq("tenant_id",member.tenant_id).maybeSingle();
  if(existing.error)throw existing.error;if(existing.data)return NextResponse.json({id:existing.data.id});
  for(const file of files){
   const source=sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:16000000,animated:false});const meta=await source.metadata();if(!["jpeg","png","webp"].includes(meta.format??""))throw new Error("format");
   const buffer=await source.rotate().resize(1600,1600,{fit:"inside",withoutEnlargement:true}).webp({quality:85}).toBuffer();
   const path=`${member.tenant_id}/staff/${user.id}/${input.data.request}/${crypto.randomUUID()}.webp`;
   const upload=await admin.storage.from("product-images").upload(path,buffer,{contentType:"image/webp",upsert:false});if(upload.error)throw upload.error;paths.push(path);images.push(admin.storage.from("product-images").getPublicUrl(path).data.publicUrl);
  }
  saveStarted=true;
  const result=await client.rpc("staff_create_product",{p_access:member.id,p_request:input.data.request,p_data:{title:input.data.title,description:input.data.description,price:input.data.price,stock:input.data.stock,images}});
  if(result.error)throw result.error;
  revalidatePath("/staff");revalidatePath("/admin/catalog");return NextResponse.json({id:result.data});
 }catch{if(!saveStarted&&paths.length)await admin.storage.from("product-images").remove(paths);return fail("Не удалось подтвердить сохранение. Проверьте список товаров и повторите попытку — повтор не создаст второй товар.",400);}
}
