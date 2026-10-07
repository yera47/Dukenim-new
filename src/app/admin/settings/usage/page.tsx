import Link from"next/link";
import{requireRole}from"@/lib/auth";
import{createAdminClient}from"@/lib/supabase/admin";
import{loadTenantCreditBalance,unavailableCreditBalance}from"@/lib/ai/product-credit-admin";

export default async function UsagePage(){
  const{tenantId}=await requireRole(["owner","superadmin"]);
  let balance=unavailableCreditBalance(tenantId??"","migration_unavailable");
  if(tenantId&&process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY){try{balance=await loadTenantCreditBalance(createAdminClient(),tenantId);}catch{/* Fail closed below. */}}
  const ready=balance.availability==="ready";
  return <section className="mx-auto max-w-3xl space-y-6">
    <Link href="/admin/settings" className="text-sm text-neutral-500">← Настройки</Link>
    <div><h1 className="text-3xl font-bold">Использование AI</h1><p className="mt-3 text-neutral-500">Баланс читается из того же серверного ledger, которым пользуется superadmin. Магазин не получает доступ к платформенным лимитам или начислениям.</p></div>
    {!ready?<div className="rounded-2xl border border-amber-200 bg-amber-50 p-6" role="status"><b>Баланс пока недоступен</b><p className="mt-2 text-sm leading-6 text-amber-900">{balance.message} AI‑генерация и покупка дополнительных кредитов остаются выключены; старый локальный счётчик не используется как запасной.</p></div>:<>
      <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-5"><small className="text-neutral-500">Доступно</small><b className="mt-2 block text-3xl">{balance.availableTotal}</b></div><div className="rounded-2xl border bg-white p-5"><small className="text-neutral-500">Включено в период</small><b className="mt-2 block text-3xl">{balance.availableAllowance}</b></div><div className="rounded-2xl border bg-white p-5"><small className="text-neutral-500">Куплено отдельно</small><b className="mt-2 block text-3xl">{balance.availablePurchased}</b></div></div>
      <div className="rounded-2xl border bg-white p-6"><div className="flex justify-between gap-4"><b>Зарезервировано в активных задачах</b><span>{balance.reservedAllowance+balance.reservedPurchased}</span></div><p className="mt-3 text-sm leading-6 text-neutral-500">Сначала используются кредиты периода, затем купленные. Купленные кредиты не показываются как сгорающие. Итог уменьшается только после сохранения технически корректного результата.</p>{!balance.generationEnabled&&<p className="mt-4 rounded-xl bg-neutral-100 p-4 text-sm">Генерация отключена администратором платформы.</p>}</div>
    </>}
    <Link href="/admin/ai-studio" aria-disabled={!ready||!balance.generationEnabled} className={`btn btn-primary ${!ready||!balance.generationEnabled?"pointer-events-none opacity-45":""}`}>Открыть AI Studio</Link>
  </section>;
}
