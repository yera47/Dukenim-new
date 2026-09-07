"use server";
import{revalidatePath}from"next/cache";import{requireRole}from"@/lib/auth";import{createAdminClient}from"@/lib/supabase/admin";import{createPlatformAuditEvent,createTenantAndOwner,rootMessage,setRequestStatus}from"@/lib/queries/root";import type{Plan}from"@/lib/plans";import type{Database}from"@/types/database";
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
export async function updateCrmIntegrationStatus(form:FormData){const{client,actorId}=await rootClient();const id=String(form.get("integrationId")??"");const status=String(form.get("status")??"");const summary=String(form.get("summary")??"").trim();const allowed=new Set(["credentials_needed","submitted","preflight","waiting_owner","connected","failed","revoked"]);if(!id||!allowed.has(status)||summary.length>1200)throw new Error("Некорректные данные очереди");const{data,error}=await client.from("crm_integration_requests").update({status:status as Database["public"]["Tables"]["crm_integration_requests"]["Row"]["status"],preflight_summary:summary||null,last_status_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id).select("tenant_id").single();if(error)throw error;await createPlatformAuditEvent(client,{actorId,tenantId:data.tenant_id,action:"crm_integration.status_changed",metadata:{integrationId:id,status}});revalidatePath("/root/integrations")}

const UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
