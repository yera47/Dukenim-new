import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCheckoutOptions } from "@/lib/queries/orders";
import { DEMO_TENANT_ID, resolveTenant } from "@/lib/tenant";
import { CheckoutClient, type CheckoutZone } from "./checkout-client";

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenant(slug);
  if (!tenant) notFound();

  if (tenant.id === DEMO_TENANT_ID) {
    return <><p className="container mt-6 rounded-xl bg-[var(--store-surface)] p-4 text-sm">Демонстрационный магазин: заказ не будет отправлен продавцу.</p><CheckoutClient demo slug={slug} deliveryEnabled pickupEnabled minOrder={0} zones={[{ id: "00000000-0000-4000-8000-000000000001", name: "По городу", cost: 1500, freeFrom: 50000, etaText: "1–2 дня" }]}/></>;
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <CheckoutClient slug={slug} deliveryEnabled pickupEnabled minOrder={0} zones={[{ id: "00000000-0000-4000-8000-000000000001", name: "По городу", cost: 1500, freeFrom: null, etaText: "1–2 дня" }]}/>;
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

  return <CheckoutClient
    slug={slug}
    deliveryEnabled={Boolean(options.settings?.delivery_enabled && zones.length)}
    pickupEnabled={options.settings?.pickup_enabled ?? true}
    minOrder={options.settings?.min_order ?? 0}
    zones={zones}
  />;
}
