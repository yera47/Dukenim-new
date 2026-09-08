import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStorefrontSettings, getPublicStorePolicies } from "@/lib/queries/owner";
import { getStorefrontProducts } from "@/lib/queries/storefront";
import { StoreHome } from "@/components/store/store-home";
import { StoreHeader } from "@/components/store/store-header";
import { CartProvider } from "@/components/store/cart-provider";
import { storefrontStyle } from "@/lib/storefront-style";
import { launchTemplatesForPlan, palettes } from "@/lib/storefront-theme";
import { computeEntitlement } from "@/lib/entitlement";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};

export default async function StorePreview({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const context=await requireRole(["owner","superadmin"]);
  if(!context.user||!context.tenantId) return <p>Для предпросмотра нужен аккаунт владельца магазина.</p>;
  const client=await createClient();
  const {data:tenant,error}=await client.from("tenants").select("id,slug,name,catalog_name,tagline,business_vertical,accent_color,plan,next_plan,status,trial_ends_at").eq("id",context.tenantId).single();
  if(error||!tenant) return <p role="alert">Не удалось загрузить магазин.</p>;
  const [theme,products,policies,campaignResult]=await Promise.all([
    getStorefrontSettings(client,tenant.id),getStorefrontProducts(client,tenant.id),getPublicStorePolicies(client,tenant.id),
    client.from("storefront_campaigns").select("title,eyebrow,body,cta_label,cta_href,image_url").eq("tenant_id",tenant.id).eq("status","published").order("created_at",{ascending:false}).limit(1).maybeSingle()
  ]);
  if(theme.error||policies.error||campaignResult.error) return <p role="alert">Предпросмотр не загрузился. Сохранённый магазин не изменён.</p>;
  const query=await searchParams;
  const plan=computeEntitlement(tenant).plan;
  const settings=theme.data??{tenant_id:tenant.id,template_key:"atelier",palette_key:"mono",brand_color:null,hero_title:null,hero_subtitle:null,hero_image_url:null,hero_cta_label:"Смотреть каталог",updated_at:""};
  if(typeof query.template==="string"&&launchTemplatesForPlan(plan).some(t=>t.key===query.template)) settings.template_key=query.template;
  if(typeof query.palette==="string"&&palettes.some(p=>p.key===query.palette)) settings.palette_key=query.palette;
  if(typeof query.name==="string") tenant.catalog_name=query.name.slice(0,80);
  return <div style={storefrontStyle(settings,plan,tenant.accent_color)} className="min-h-screen bg-[var(--store-bg)] text-[var(--store-ink)]">
    <p className="border-b p-3 text-sm">Настоящий предпросмотр · изменения здесь не публикуются. Покупка отключена.</p>
    <div inert><CartProvider><StoreHeader slug={tenant.slug} name={tenant.name} categories={Array.from(new Set(products.map(p=>p.category).filter(Boolean)))}/>
      <StoreHome slug={tenant.slug} tenant={tenant} settings={settings} products={products} campaign={campaignResult.data} storePolicies={policies.data}/>
    </CartProvider></div>
  </div>;
}
