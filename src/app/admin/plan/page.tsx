import Link from "next/link";
import { ArrowRight, Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/queries/owner";
import { getActiveSubscription } from "@/lib/queries/subscriptions";
import { planAnnualPrice, planFeatures, planName, planPrice, publicPlans, type Plan } from "@/lib/plans";
import { TrialTimer } from "@/components/admin/trial-timer";

const plans = publicPlans;
export default async function PlanPage({ searchParams }: { searchParams: Promise<{ locked?: string; expired?: string }> }) {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  const query = await searchParams;
  let plan: Plan = "basic", nextPlan: Plan = "standard", period: string | null = null, trialEndsAt: string | null = null, status = "trial";
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && tenantId) {
    const client = await createClient();
    const [tenantResult, subscriptionResult] = await Promise.all([getTenant(client, tenantId), getActiveSubscription(client, tenantId)]);
    const tenant = tenantResult.data;
    if (tenant) { plan = tenant.plan; nextPlan = tenant.next_plan ?? "standard"; trialEndsAt = tenant.trial_ends_at; status = tenant.status; }
    period = subscriptionResult.data?.current_period_end ?? null;
  }
  return <>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="data-label">ПОДПИСКА</div><h1 className="mt-2 text-3xl font-extrabold">Тариф и доступ</h1></div>{status === "trial" && trialEndsAt && <TrialTimer endsAt={trialEndsAt}/>}</div>
    {(query.locked || query.expired) && <div className="mt-5 flex gap-3 rounded-[var(--r-card)] bg-[var(--accent-soft)] p-4"><LockKeyhole className="shrink-0 text-[var(--accent)]"/><p><b>{query.expired ? "Бесплатный период завершён." : "Эта функция входит в другой тариф."}</b><span className="muted block text-sm">Выберите подходящий план, чтобы продолжить работу без ограничений.</span></p></div>}
    <section className="card mt-6 overflow-hidden"><div className="bg-[var(--accent-dark)] p-7 text-white"><span className="badge bg-white/10 text-[var(--accent-bright)]">{status === "trial" ? "7 ДНЕЙ БЕСПЛАТНО" : "ТЕКУЩИЙ ПЛАН"}</span><h2 className="mt-4 text-4xl font-extrabold">{planName[status === "trial" ? nextPlan : plan]}</h2><p className="mt-2 text-white/65">{status === "trial" ? `После бесплатного периода: от ${planPrice[nextPlan].toLocaleString("ru-KZ")} ₸ в месяц. Автосписания нет, а оплата появится только после подключения официального провайдера.` : period ? `Активен до ${new Date(period).toLocaleDateString("ru-KZ")}` : "Управление подпиской"}</p></div></section>
    <div className="mt-6 grid gap-4 xl:grid-cols-2">{plans.map((item) => <article key={item} className={`card flex flex-col p-6 ${item === nextPlan ? "ring-2 ring-[var(--accent)]" : ""}`}><div className="flex items-start justify-between"><div><p className="data-label">КАТАЛОГ + ПОДПИСКА</p><h2 className="mt-2 text-2xl font-extrabold">{planName[item]}</h2></div>{item === nextPlan && <span className="badge">ВЫБРАН</span>}</div><p className="mt-4 text-3xl font-extrabold tabular">{planPrice[item].toLocaleString("ru-KZ")} ₸<span className="text-sm font-medium text-[var(--ink-60)]"> / мес.</span></p><p className="mt-2 text-sm text-[var(--ink-60)]">или {planAnnualPrice[item].toLocaleString("ru-KZ")} ₸ за год</p><div className="my-6 h-px bg-[var(--line)]"/><div className="flex-1 space-y-3">{planFeatures[item].map(feature => <p key={feature} className="flex gap-2 text-sm"><Check size={18} className="shrink-0 text-[var(--success)]"/>{feature}</p>)}</div><Link href={`/admin/plan/checkout?plan=${item}`} className={`btn mt-6 w-full ${item === nextPlan ? "btn-primary" : "btn-secondary"}`}>Выбрать {planName[item]} <ArrowRight size={17}/></Link></article>)}</div>
    <p className="mt-5 flex items-center gap-2 text-sm text-[var(--ink-60)]"><ShieldCheck size={17}/> Оплата откроется у сертифицированного провайдера. Dukenim не хранит данные банковских карт.</p>
  </>;
}
