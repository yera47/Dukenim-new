import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCheckoutOptions } from "@/lib/queries/orders";
import { resolveTenant } from "@/lib/tenant";
import { demoVerticalById } from "@/lib/demo-catalogs";
import { CheckoutClient, type CheckoutZone } from "./checkout-client";
import Link from "next/link";
import { reservationsClient } from "@/lib/reservations";

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenant(slug);
  if (!tenant) notFound();

  if (demoVerticalById(tenant.id)) {
    return <><p className="container mt-6 rounded-xl bg-[var(--store-surface)] p-4 text-sm">Демонстрационный магазин: заказ не будет отправлен продавцу.</p><CheckoutClient demo slug={slug} deliveryEnabled pickupEnabled minOrder={0} zones={[{ id: "00000000-0000-4000-8000-000000000001", name: "По городу", cost: 1500, freeFrom: 50000, etaText: "1–2 дня" }]}/></>;
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <CheckoutClient slug={slug} deliveryEnabled={false} pickupEnabled={false} minOrder={0} zones={[]}/>;
  }

  const options = await getCheckoutOptions(createAdminClient(), tenant.id);
  if (options.error) {
    return <CheckoutClient slug={slug} deliveryEnabled={false} pickupEnabled={false} minOrder={0} zones={[]}/>;
  }
  const zones: CheckoutZone[] = options.zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    cost: zone.cost,
    freeFrom: zone.free_from,
    etaText: zone.eta_text,
  }));

  const reservation=await reservationsClient(createAdminClient()).from("reservation_settings").select("enabled").eq("tenant_id",tenant.id).maybeSingle();
  if(reservation.data?.enabled&&!options.settings?.pickup_enabled&&!(options.settings?.delivery_enabled&&zones.length)) {
    return <section className="container max-w-2xl py-12"><h1 className="text-3xl font-semibold">Заберите товар в магазине</h1><p className="my-5">Здесь доступна бронь: магазин удержит выбранные товары на указанное время. Онлайн-оплата не требуется. Адрес и условия — на следующем шаге.</p><Link style={{background:"var(--tenant-accent)",color:"var(--store-accent-ink)"}} className="inline-flex rounded-xl px-5 py-3" href={`/s/${slug}/reserve`}>Перейти к бронированию →</Link></section>;
  }
  return <>{reservation.data?.enabled&&<aside className="container pt-5 text-sm"><Link href={`/s/${slug}/reserve`} className="underline">Хотите сначала прийти в магазин? Забронировать товар →</Link></aside>}<CheckoutClient
    slug={slug}
    deliveryEnabled={Boolean(options.settings?.delivery_enabled && zones.length)}
    pickupEnabled={options.settings?.pickup_enabled ?? false}
    pickupLocation={options.settings?.pickup_location}
    minOrder={options.settings?.min_order ?? 0}
    zones={zones}
  /></>;
}
