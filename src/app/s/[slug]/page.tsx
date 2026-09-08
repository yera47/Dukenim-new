

import { StoreHome } from "@/components/store/store-home";
import { resolveTenant } from "@/lib/tenant";
import { loadProducts } from "@/lib/storefront-data";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicStorePolicies, getStorefrontSettings } from "@/lib/queries/owner";

import { demoVerticalById } from "@/lib/demo-catalogs";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await resolveTenant(slug);
  if (!tenant) return null;

  const products = await loadProducts(tenant.id);
  const demo = Boolean(demoVerticalById(tenant.id));
  const client = !demo && process.env.NEXT_PUBLIC_SUPABASE_URL ? await createClient() : null;
  const settings = client ? (await getStorefrontSettings(client, tenant.id)).data : null;
  const storePolicies = !demo && process.env.SUPABASE_SERVICE_ROLE_KEY ? (await getPublicStorePolicies(createAdminClient(), tenant.id)).data : null;
  const campaign = client
    ? (await client.from("storefront_campaigns").select("title, eyebrow, body, cta_label, cta_href, image_url").eq("tenant_id", tenant.id).eq("status", "published").order("created_at", { ascending: false }).limit(1).maybeSingle()).data
    : null;
  return <StoreHome slug={slug} tenant={tenant} products={products} settings={settings} campaign={campaign} storePolicies={storePolicies}/>;
}
