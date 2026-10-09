import{Check,Clock3,LockKeyhole,ShieldCheck}from"lucide-react";
import{requireRole}from"@/lib/auth";
import{createClient}from"@/lib/supabase/server";
import{getTenant}from"@/lib/queries/owner";
import{getActiveSubscription}from"@/lib/queries/subscriptions";
import{planFeatures}from"@/lib/plans";
import{getSaasBillingAvailability}from"@/lib/billing-availability";

import{TrialTimer}from"@/components/admin/trial-timer";

export default async function PlanPage({searchParams}:{searchParams:Promise<{locked?:string;expired?:string;portal?:string}>}){
  const{tenantId}=await requireRole(["owner","superadmin"]);const query=await searchParams;
  let period:string|null=null;let trialEndsAt:string|null=null;let status:"active"|"paused"|"trial"="trial";
  if(process.env.NEXT_PUBLIC_SUPABASE_URL&&tenantId){const client=await createClient();const[tenantResult,subscriptionResult]=await Promise.all([getTenant(client,tenantId),getActiveSubscription(client,tenantId)]);const tenant=tenantResult.data;if(tenant){trialEndsAt=tenant.trial_ends_at;status=tenant.status;}period=subscriptionResult.data?.current_period_end??null;}
  const serverNow=Date.now();const billing=getSaasBillingAvailability();
  return <>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="data-label">Подписка</div><h1 className="mt-2 text-3xl font-extrabold">План и оплата</h1></div>{status==="trial"&&trialEndsAt&&<TrialTimer endsAt={trialEndsAt} serverNow={serverNow}/>}</div>
    {(query.locked||query.expired)&&<div className="mt-5 flex gap-3 rounded-[var(--r-card)] bg-[var(--accent-soft)] p-4"><LockKeyhole className="shrink-0 text-[var(--accent)]"/><p><b>{query.expired?"Пробный период закончился.":"Эта функция недоступна."}</b><span className="muted block text-sm">Доступ определяется сохранённым серверным статусом магазина.</span></p></div>}
    {query.portal&&<div className="mt-5 flex gap-3 rounded-[var(--r-card)] bg-[var(--surface-2)] p-4"><Clock3 className="shrink-0 text-[var(--accent)]"/><p><b>Управление оплатой пока недоступно.</b><span className="muted block text-sm">Мы не создавали платёж и не меняли подписку.</span></p></div>}
    <section className="card mt-6 overflow-hidden"><div className="bg-[var(--accent-dark)] p-7 text-white"><span className="badge bg-white/10 text-[var(--accent-bright)]">{status==="trial"?"Пробный доступ":status==="active"?"Активный доступ":"Доступ приостановлен"}</span><h2 className="mt-4 text-4xl font-extrabold">Каталог</h2><p className="mt-2 text-white/65">{status==="trial"?"7 дней бесплатно. Автоматического списания нет.":period?`Текущий оплаченный период — до ${new Date(period).toLocaleDateString("ru-KZ")}.`:"Доступ к функциям определяется сохранённым статусом магазина."}</p></div></section>
    <article className="card mt-6 flex max-w-3xl flex-col p-6"><div className="flex items-start justify-between gap-3"><div><p className="data-label">Единый тариф · все функции</p><h2 className="mt-2 text-2xl font-extrabold">Каталог</h2></div><span className="badge">7 дней бесплатно</span></div><p className="mt-4 text-3xl font-extrabold tabular">24 900 ₸ <span className="text-base font-semibold">/ месяц</span></p><p className="mt-2 text-sm text-[var(--ink-60)]">Во время пробного периода списаний нет. После него оплата подключается отдельно; сейчас платёжный провайдер не оформляет автоматическое списание.</p><div className="my-6 h-px bg-[var(--line)]"/><div className="space-y-3">{planFeatures.basic.map(feature=><p key={feature} className="flex gap-2 text-sm"><Check size={18} className="shrink-0 text-[var(--success)]"/>{feature}</p>)}</div></article>    <p className="mt-5 text-sm text-[var(--ink-60)]">{billing.message}</p><p className="mt-3 flex items-center gap-2 text-sm text-[var(--ink-60)]"><ShieldCheck size={17}/> Paddle рассматривается только для SaaS‑подписки Dukenim. Оплата товаров магазинов через него не планируется; iOS требует отдельного решения по IAP.</p>
  </>;
}
