"use server";
import {redirect} from "next/navigation";
export async function deleteEmptyStore(form:FormData){
 const {client,actorId}=await rootClient();
 const tenant=String(form.get("tenantId")??""),slug=String(form.get("confirmSlug")??"").trim(),reason=String(form.get("reason")??"").trim();
 if(!/^[0-9a-f-]{36}$/i.test(tenant)||!slug||reason.length<3||reason.length>1000)throw new Error("Проверьте адрес и причину удаления.");
 const rpc=client as unknown as {rpc:(name:"root_delete_store",args:{p_tenant:string;p_actor:string;p_slug:string;p_reason:string})=>Promise<{data:boolean|null;error:{message:string}|null}>};
 const result=await rpc.rpc("root_delete_store",{p_tenant:tenant,p_actor:actorId,p_slug:slug,p_reason:reason});
 if(result.error||!result.data)throw new Error(result.error?.message??"Удаление не выполнено.");
 revalidatePath("/root");redirect("/root");
}
import{revalidatePath}from"next/cache";import{requireRole}from"@/lib/auth";import{createAdminClient}from"@/lib/supabase/admin";import{createClient}from"@/lib/supabase/server";import{smsClient}from"@/lib/sms-db";import{createPlatformAuditEvent,createTenantAndOwner,rootMessage,setRequestStatus}from"@/lib/queries/root";import type{Plan}from"@/lib/plans";import type{Database}from"@/types/database";
async function rootClient(){const context=await requireRole(["superadmin"]);if(!context.user)throw new Error("Для действий требуется вход в аккаунт суперадминистратора.");return{client:createAdminClient(),actorId:context.user.id}}
export async function createStore(form:FormData){const{client,actorId}=await rootClient();const slug=String(form.get("slug")??"").trim().toLowerCase();if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new Error("Некорректный slug");const{data,error}=await createTenantAndOwner(client,{email:String(form.get("email")),password:String(form.get("password")),slug,name:String(form.get("name")),color:String(form.get("color")??"#0E5C4A"),plan:String(form.get("plan")??"basic")as Plan});if(error)throw error;await createPlatformAuditEvent(client,{actorId,tenantId:data?.tenantId,action:"tenant.created",reason:"Создано из root-кабинета"});revalidatePath("/root")}
export async function updateStore(form: FormData) {
  const { client, actorId } = await rootClient();
  const tenantId = String(form.get("tenantId") ?? "");
  const reason = String(form.get("reason") ?? "").trim();
  const plan = String(form.get("plan") ?? "");
  const status = String(form.get("status") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) throw new Error("Выберите существующий магазин.");
  if (reason.length < 3 || reason.length > 1000) throw new Error("Укажите причину изменения: от 3 до 1000 символов.");
  if (!["basic", "standard", "pro"].includes(plan) || !["active", "paused", "trial"].includes(status)) throw new Error("Недопустимый тариф или статус.");
  // Persist intent before privileged changes; fail closed if the audit log is unavailable.
  const audit = await createPlatformAuditEvent(client, { actorId, tenantId, action: "tenant.access_change_requested", reason, metadata: { plan, status } });
  if (audit.error) throw new Error("Журнал аудита недоступен. Изменения не выполнены.");
  // One UPDATE: never leave plan and status half-applied.
  const changed = await client.from("tenants").update({ plan: plan as Plan, status: status as "active" | "paused" | "trial" }).eq("id", tenantId).select("id").single();
  if (changed.error || !changed.data) throw new Error("Не удалось изменить магазин. Обновите страницу и проверьте его состояние.");
  const completed = await createPlatformAuditEvent(client, { actorId, tenantId, action: "tenant.access_changed", reason, metadata: { plan, status } });
  revalidatePath("/root"); revalidatePath("/admin");
  if (completed.error) throw new Error("Магазин изменён, но подтверждение аудита не записалось. Не повторяйте операцию; проверьте диагностику.");
}
export async function replyToOwner(form:FormData){const text=String(form.get("text")??"").trim();if(!text)return;const{client,actorId}=await rootClient();const tenantId=String(form.get("tenantId"));await rootMessage(client,tenantId,text);await createPlatformAuditEvent(client,{actorId,tenantId,action:"support.reply"});revalidatePath("/root")}
export async function completeRequest(form:FormData){const{client,actorId}=await rootClient();const requestId=String(form.get("requestId"));await setRequestStatus(client,requestId,"done");await createPlatformAuditEvent(client,{actorId,action:"support.request_completed",metadata:{requestId}});revalidatePath("/root")}
export async function createPromotion(form:FormData){const{client,actorId}=await rootClient();const code=String(form.get("code")??"").trim().toUpperCase();const title=String(form.get("title")??"").trim();const type=String(form.get("type")??"");const value=Number(form.get("value"));const plan=String(form.get("plan")??"")||null;const maxRaw=String(form.get("maxRedemptions")??"").trim();if(!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)||title.length<2||!Number.isInteger(value)||value<1||!["percent","fixed_kzt","free_days"].includes(type))throw new Error("Проверьте код, название и размер выгоды.");if(type==="percent"&&value>100)throw new Error("Скидка в процентах не может быть больше 100.");const{data,error}=await client.from("subscription_promotions").insert({code,title,plan:plan as Plan|null,discount_type:type as"percent"|"fixed_kzt"|"free_days",discount_value:value,max_redemptions:maxRaw?Number(maxRaw):null,created_by:actorId}).select("id").single();if(error)throw error;await createPlatformAuditEvent(client,{actorId,action:"promotion.created",reason:`${code}: ${title}`,metadata:{promotionId:data?.id}});revalidatePath("/root")}
export async function togglePromotion(form:FormData){const{client,actorId}=await rootClient();const id=String(form.get("promotionId"));const active=String(form.get("active"))==="true";const{error}=await client.from("subscription_promotions").update({is_active:active,updated_at:new Date().toISOString()}).eq("id",id);if(error)throw error;await createPlatformAuditEvent(client,{actorId,action:active?"promotion.enabled":"promotion.disabled",metadata:{promotionId:id}});revalidatePath("/root")}
export async function updateCrmIntegrationStatus(form:FormData){
 const{client,actorId}=await rootClient();
 const id=String(form.get("integrationId")??"");const status=String(form.get("status")??"");const summary=String(form.get("summary")??"").trim();
 const allowed=new Set(["credentials_needed","submitted","preflight","waiting_owner","connected","failed","revoked"]);
 if(!UUID_PATTERN.test(id)||!allowed.has(status)||summary.length>1200)throw new Error("Некорректные данные очереди");
 const request=await client.from("crm_integration_requests").select("tenant_id,provider,status").eq("id",id).single();
 if(request.error||!request.data)throw new Error("Заявка не найдена.");
 if(status==="connected"){
  if(request.data.provider!=="planfix"&&request.data.provider!=="biznes_ru")throw new Error("Для этой CRM ещё нет действующего технического подключения.");
  const connection=await client.from("integration_connections").select("id,last_sync_at").eq("tenant_id",request.data.tenant_id).eq("provider",request.data.provider).eq("status","active").limit(1).maybeSingle();
  if(connection.error||!connection.data||!connection.data.last_sync_at)throw new Error("Нельзя отметить CRM подключённой без активного соединения и успешной синхронизации.");
 }
 const audit=await createPlatformAuditEvent(client,{actorId,tenantId:request.data.tenant_id,action:"crm_integration.status_change_requested",metadata:{integrationId:id,before:request.data.status,after:status}});
 if(audit.error)throw new Error("Журнал аудита недоступен. Статус не изменён.");
 const{error}=await client.from("crm_integration_requests").update({status:status as Database["public"]["Tables"]["crm_integration_requests"]["Row"]["status"],preflight_summary:summary||null,last_status_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id).eq("tenant_id",request.data.tenant_id);
 if(error)throw new Error("Не удалось изменить статус CRM-заявки.");
 await createPlatformAuditEvent(client,{actorId,tenantId:request.data.tenant_id,action:"crm_integration.status_changed",metadata:{integrationId:id,before:request.data.status,after:status}});
 revalidatePath("/root/integrations");
}

const UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function setRootStaffAccess(form:FormData){
 const {client,actorId}=await rootClient();
 const access=String(form.get("accessId")??"");const email=String(form.get("confirmEmail")??"").trim().toLowerCase();
 const active=String(form.get("active"))==="true";const revision=Number(form.get("revision"));const reason=String(form.get("reason")??"").trim();
 if(!UUID_PATTERN.test(access)||!email||!Number.isInteger(revision)||revision<0||reason.length<3||reason.length>1000)throw new Error("Проверьте сотрудника, email и причину изменения.");
 const rpc=client as unknown as {rpc:(name:"root_set_staff_access",args:{p_access:string;p_actor:string;p_email:string;p_active:boolean;p_expected_revision:number;p_reason:string})=>Promise<{data:boolean|null;error:{message:string}|null}>};
 const result=await rpc.rpc("root_set_staff_access",{p_access:access,p_actor:actorId,p_email:email,p_active:active,p_expected_revision:revision,p_reason:reason});
 if(result.error||!result.data)throw new Error(result.error?.message??"Доступ сотрудника не изменён.");
 revalidatePath("/root/accounts");revalidatePath("/admin/team");revalidatePath("/staff");
}
export async function cancelRootUnpaidOrder(form:FormData){
 const {client,actorId}=await rootClient();
 const order=String(form.get("orderId")??"");const number=Number(form.get("confirmNumber"));
 const expected=String(form.get("expectedStatus")??"");const reason=String(form.get("reason")??"").trim();
 if(!UUID_PATTERN.test(order)||!Number.isSafeInteger(number)||number<1||!["new","confirmed","assembled","delivering"].includes(expected)||reason.length<3||reason.length>1000)throw new Error("Проверьте заказ, номер и причину отмены.");
 const rpc=client as unknown as {rpc:(name:"root_cancel_unpaid_order",args:{p_order:string;p_actor:string;p_number:number;p_expected_status:string;p_reason:string})=>Promise<{data:boolean|null;error:{message:string}|null}>};
 const result=await rpc.rpc("root_cancel_unpaid_order",{p_order:order,p_actor:actorId,p_number:number,p_expected_status:expected,p_reason:reason});
 if(result.error||!result.data)throw new Error(result.error?.message??"Заказ не отменён. Обновите страницу.");
 revalidatePath("/root/orders");revalidatePath(`/root/orders/${order}`);revalidatePath("/admin/orders");revalidatePath("/admin/stock");
}
export async function setRootCatalogPublication(form:FormData){
 const {client,actorId}=await rootClient();
 const tenant=String(form.get("tenantId")??"");const slug=String(form.get("confirmSlug")??"").trim();
 const expected=String(form.get("expected"));const publish=String(form.get("publish"));const reason=String(form.get("reason")??"").trim();
 if(!UUID_PATTERN.test(tenant)||!slug||!["true","false"].includes(expected)||!["true","false"].includes(publish)||expected===publish||reason.length<3||reason.length>1000)throw new Error("Проверьте магазин, адрес и причину изменения.");
 const rpc=client as unknown as {rpc:(name:"root_set_catalog_publication",args:{p_tenant:string;p_actor:string;p_slug:string;p_expected:boolean;p_publish:boolean;p_reason:string})=>Promise<{data:boolean|null;error:{message:string}|null}>};
 const result=await rpc.rpc("root_set_catalog_publication",{p_tenant:tenant,p_actor:actorId,p_slug:slug,p_expected:expected==="true",p_publish:publish==="true",p_reason:reason});
 if(result.error||!result.data)throw new Error(result.error?.message??"Публикация не изменена. Обновите страницу.");
 revalidatePath("/root");revalidatePath(`/root/stores/${tenant}`);revalidatePath(`/s/${slug}`);
}
export async function updateRootProduct(form:FormData){
  const{client,actorId}=await rootClient();
  const tenantId=String(form.get("tenantId")??"");const productId=String(form.get("productId")??"");
  const title=String(form.get("title")??"").trim();const description=String(form.get("description")??"").trim();
  const price=Number(form.get("price"));const oldPriceRaw=String(form.get("oldPrice")??"").trim();const oldPrice=oldPriceRaw?Number(oldPriceRaw):null;
  const isActive=String(form.get("isActive"))==="true";const reason=String(form.get("reason")??"").trim();
  if(!UUID_PATTERN.test(tenantId)||!UUID_PATTERN.test(productId))throw new Error("Выберите существующий магазин и товар.");
  if(title.length<2||title.length>160||description.length>5000)throw new Error("Проверьте название и описание товара.");
  if(!Number.isInteger(price)||price<0||price>2_000_000_000||oldPrice!==null&&(!Number.isInteger(oldPrice)||oldPrice<0||oldPrice>2_000_000_000))throw new Error("Цена должна быть целым количеством тенге.");
  if(reason.length<3||reason.length>1000)throw new Error("Укажите причину изменения: от 3 до 1000 символов.");
  const current=await client.from("products").select("id,tenant_id,title,description,price,old_price,is_active").eq("id",productId).eq("tenant_id",tenantId).single();
  if(current.error||!current.data)throw new Error("Товар не найден в выбранном магазине.");
  const next={title,description,price,old_price:oldPrice,is_active:isActive};
  const audit=await createPlatformAuditEvent(client,{actorId,tenantId,action:"product.change_requested",reason,metadata:{productId,before:current.data,after:next}});
  if(audit.error)throw new Error("Журнал аудита недоступен. Товар не изменён.");
  const changed=await client.from("products").update(next).eq("id",productId).eq("tenant_id",tenantId).select("id").single();
  if(changed.error||!changed.data)throw new Error("Не удалось изменить товар. Обновите страницу перед повтором.");
  await createPlatformAuditEvent(client,{actorId,tenantId,action:"product.changed",reason,metadata:{productId,before:current.data,after:next}});
  revalidatePath(`/root/stores/${tenantId}`);revalidatePath("/s/[slug]","page");revalidatePath("/s/[slug]/product/[id]","page");
}

export async function reviewSmsSender(form:FormData){
  await requireRole(["superadmin"]);
  const tenantId=String(form.get("tenantId")??"");const status=String(form.get("status")??"");const reason=String(form.get("reason")??"").trim();
  if(!UUID_PATTERN.test(tenantId)||!["approved","rejected","pending"].includes(status)||reason.length<3||reason.length>1000)throw new Error("Проверьте статус и причину модерации.");
  const{data,error}=await smsClient(await createClient()).rpc("review_sms_sender",{p_tenant:tenantId,p_status:status,p_reason:reason});
  if(error||!data)throw new Error(error?.message??"Статус отправителя не изменён.");
  revalidatePath(`/root/stores/${tenantId}`);revalidatePath("/admin/settings/sms");
}
