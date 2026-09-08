import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ZoneForm } from "./zone-form";
import { DeliverySettingsForm } from "./settings-form";

export default async function DeliverySettings() {
  const context = await requireRole(["owner", "superadmin"]);
  if (!context.user || !context.tenantId) return <p>Войдите в аккаунт владельца магазина для настройки доставки.</p>;
  const client = await createClient();
  const [zones, settings] = await Promise.all([
    client.from("delivery_zones").select("id,name,cost,free_from,eta_text,is_active").eq("tenant_id", context.tenantId).order("name"),
    client.from("tenant_settings").select("delivery_enabled,min_order").eq("tenant_id", context.tenantId).maybeSingle(),
  ]);
  if (zones.error || settings.error) return <p role="alert">Не удалось загрузить настройки. Обновите страницу — существующие зоны не изменены.</p>;
  return <main className="mx-auto max-w-3xl space-y-5">
    <Link href="/admin/settings" className="btn btn-secondary">← Настройки магазина</Link>
    <h1 className="text-3xl font-semibold">Зоны и стоимость доставки</h1>
    <p>Укажите реальные условия. Стоимость проверяется сервером при оформлении заказа. Чтобы временно скрыть зону, снимите отметку доступности.</p>
    {settings.data && <DeliverySettingsForm enabled={settings.data.delivery_enabled} minOrder={settings.data.min_order}/>}
    {!settings.data?.delivery_enabled && <p role="status" className="rounded-xl border p-4">Доставка у магазина выключена. Зоны можно подготовить, но покупателям они пока не предлагаются.</p>}
    {zones.data?.map(zone => <ZoneForm key={zone.id} zone={zone}/>)}
    <h2 className="text-xl font-semibold">Добавить зону</h2>
    <ZoneForm zone={{ id: crypto.randomUUID(), name: "", cost: 0, free_from: null, eta_text: null, is_active: false }}/>
    <p className="text-sm text-neutral-500">Самовывоз с предоплатой и бронь ещё не подключены. Они не включаются сохранением зоны доставки.</p>
  </main>;
}
