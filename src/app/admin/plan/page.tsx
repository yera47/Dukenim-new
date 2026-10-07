import{Check,Clock3,LockKeyhole,ShieldCheck,Sparkles}from"lucide-react";
import{requireRole}from"@/lib/auth";
import{createClient}from"@/lib/supabase/server";
import{getTenant}from"@/lib/queries/owner";
import{getActiveSubscription}from"@/lib/queries/subscriptions";
import{planFeatures,planPrice,type Plan}from"@/lib/plans";
import{getSaasBillingAvailability}from"@/lib/billing-availability";
import{premiumDraft}from"@/lib/premium-plan";
import{TrialTimer}from"@/components/admin/trial-timer";

export default async function PlanPage({searchParams}:{searchParams:Promise<{locked?:string;expired?:string;portal?:string}>}){
  const{tenantId}=await requireRole(["owner","superadmin"]);const query=await searchParams;
  let plan:Plan="basic";let period:string|null=null;let trialEndsAt:string|null=null;let status:"active"|"paused"|"trial"="trial";
  if(process.env.NEXT_PUBLIC_SUPABASE_URL&&tenantId){const client=await createClient();const[tenantResult,subscriptionResult]=await Promise.all([getTenant(client,tenantId),getActiveSubscription(client,tenantId)]);const tenant=tenantResult.data;if(tenant){plan=tenant.plan;trialEndsAt=tenant.trial_ends_at;status=tenant.status;}period=subscriptionResult.data?.current_period_end??null;}
  const serverNow=Date.now();const billing=getSaasBillingAvailability();const premium=premiumDraft();
  return <>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="data-label">Подписка</div><h1 className="mt-2 text-3xl font-extrabold">План и оплата</h1></div>{status==="trial"&&trialEndsAt&&<TrialTimer endsAt={trialEndsAt} serverNow={serverNow}/>}</div>
    {(query.locked||query.expired)&&<div className="mt-5 flex gap-3 rounded-[var(--r-card)] bg-[var(--accent-soft)] p-4"><LockKeyhole className="shrink-0 text-[var(--accent)]"/><p><b>{query.expired?"Пробный период закончился.":"Эта функция недоступна."}</b><span className="muted block text-sm">Доступ определяется сохранённым серверным статусом магазина.</span></p></div>}
    {query.portal&&<div className="mt-5 flex gap-3 rounded-[var(--r-card)] bg-[var(--surface-2)] p-4"><Clock3 className="shrink-0 text-[var(--accent)]"/><p><b>Управление оплатой пока недоступно.</b><span className="muted block text-sm">Мы не создавали платёж и не меняли подписку.</span></p></div>}
    <section className="card mt-6 overflow-hidden"><div className="bg-[var(--accent-dark)] p-7 text-white"><span className="badge bg-white/10 text-[var(--accent-bright)]">{status==="trial"?"Пробный доступ":status==="active"?"Активный доступ":"Доступ приостановлен"}</span><h2 className="mt-4 text-4xl font-extrabold">{plan==="basic"?"Base":"Premium"}</h2><p className="mt-2 text-white/65">{status==="trial"?"Подписка не продлевается автоматически.":period?`Текущий оплаченный период — до ${new Date(period).toLocaleDateString("ru-KZ")}.`:"Статус хранится на сервере и не определяется интерфейсом."}</p></div></section>
    <div className="mt-6 grid gap-5 xl:grid-cols-2">
      <article className="card flex flex-col p-6"><div className="flex items-start justify-between gap-3"><div><p className="data-label">Полный магазин без AI</p><h2 className="mt-2 text-2xl font-extrabold">Base</h2></div><span className="badge">Каталог и заказы</span></div><p className="mt-4 text-3xl font-extrabold tabular">{planPrice.basic.toLocaleString("ru-KZ")} ₸</p><p className="mt-2 text-sm text-[var(--ink-60)]">Период оплаты владелец ещё не подтвердил.</p><div className="my-6 h-px bg-[var(--line)]"/><div className="flex-1 space-y-3">{planFeatures.basic.map(feature=><p key={feature} className="flex gap-2 text-sm"><Check size={18} className="shrink-0 text-[var(--success)]"/>{feature}</p>)}</div></article>
      <article className="card flex flex-col border border-[var(--accent)] p-6"><div className="flex items-start justify-between gap-3"><div><p className="data-label">Предварительный Premium</p><h2 className="mt-2 flex items-center gap-2 text-2xl font-extrabold"><Sparkles size={21}/>Premium</h2></div><span className="badge">Не продаётся</span></div><p className="mt-4 text-3xl font-extrabold tabular">{premium.priceKzt.toLocaleString("ru-KZ")} ₸</p><p className="mt-2 text-sm text-[var(--ink-60)]">Период оплаты ещё должен подтвердить владелец; live‑цена и продукт у провайдера не создавались.</p><div className="my-6 h-px bg-[var(--line)]"/><div className="flex-1 space-y-3">{premium.features.map(feature=><p key={feature} className="flex gap-2 text-sm"><Check size={18} className="shrink-0 text-[var(--accent)]"/>{feature}</p>)}</div><p className="mt-5 rounded-xl bg-[var(--surface-2)] p-3 text-sm"><b>AI‑квота:</b> {premium.photoPackLimit===null?"не утверждена; unlimited не обещаем.":`${premium.photoPackLimit} пакетов — конфигурируемый черновик, не live‑обещание.`}</p><button type="button" disabled className="btn btn-primary mt-5 w-full cursor-not-allowed opacity-60">Оплата пока недоступна</button></article>
    </div>
    <p className="mt-5 text-sm text-[var(--ink-60)]">{billing.message}</p><p className="mt-3 flex items-center gap-2 text-sm text-[var(--ink-60)]"><ShieldCheck size={17}/> Paddle рассматривается только для SaaS‑подписки Dukenim. Оплата товаров магазинов через него не планируется; iOS требует отдельного решения по IAP.</p>
  </>;
}
