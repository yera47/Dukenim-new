import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function UsagePage() {
  const {tenantId}=await requireRole(["owner","superadmin"]);
  const client=tenantId&&process.env.NEXT_PUBLIC_SUPABASE_URL?await createClient():null;
  const result=client?await client.from("tenants").select("*").eq("id",tenantId!).single():null;
  const row=result?.data as {ai_credit_balance?:number;ai_credits_reset_at?:string}|null|undefined;
  const rawBalance=row?.ai_credit_balance;
  const reset=row?.ai_credits_reset_at?new Date(row.ai_credits_reset_at):null;
  const renewalDue=reset&&reset.getTime()<=Date.now();
  const balance=typeof rawBalance==="number"?rawBalance+(renewalDue?120:0):null;
  const available=balance===null?null:Math.min(100,Math.round(balance/120*100));
  return <section className="mx-auto max-w-2xl space-y-6">
    <Link href="/admin/settings" className="text-sm text-neutral-500">← Настройки</Link>
    <div><h1 className="text-3xl font-bold">Использование AI</h1><p className="mt-3 text-neutral-500">Здесь можно проверить доступный объём работы помощника.</p></div>
    <div className="rounded-2xl border bg-white p-6">{available===null?<p role="status">Не удалось загрузить использование. Попробуйте обновить страницу.</p>:<>
      <div className="flex justify-between"><b>Доступно от месячного объёма</b><span>{available}%</span></div>
      <progress aria-label="Доступный объём AI" max={100} value={available} className="mt-5 h-2 w-full accent-black"/>
      <p className="mt-4 text-sm leading-7 text-neutral-500">Объём пополняется ежемесячно. Неиспользованный и дополнительно приобретённый объём учитываются в остатке. В чате предупреждаем, когда остаётся не более 10% месячного объёма.</p>
      {reset&&!renewalDue&&<p className="mt-4 text-sm">Следующее пополнение: {reset.toLocaleDateString("ru-KZ",{timeZone:"Asia/Almaty"})}</p>}
      {available<=10&&<p className="mt-4 rounded-xl bg-neutral-100 p-4 text-sm">Доступный объём заканчивается. <Link className="underline" href="/admin/requests?source=ai-studio">Обратиться в поддержку</Link></p>}
    </>}</div>
    <Link href="/admin/ai-studio" className="btn btn-primary">Вернуться в AI Studio</Link>
  </section>;
}
