import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StoryEditor, type EditorStory } from "./story-editor";
import { storefrontStyle } from "@/lib/storefront-style";
import { approachForTemplate } from "@/lib/commerce-configurations";
import { getStorefrontProducts } from "@/lib/queries/storefront";

export default async function FoodStoriesPage() {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  const client = await createClient();
  const [tenant, settings, storyResult, products] = await Promise.all([
    client.from("tenants").select("name,catalog_name,tagline,logo_url,business_vertical,plan,accent_color").eq("id", tenantId!).single(),
    client.from("tenant_storefront_settings").select("*").eq("tenant_id", tenantId!).maybeSingle(),
    client.from("food_stories").select("id,title,caption,media_path,media_type,product_id,status,sort_order").eq("tenant_id", tenantId!).order("sort_order").order("created_at"),
    getStorefrontProducts(client,tenantId!).catch(()=>[]),
  ]);
  const stories: EditorStory[] = (storyResult.data ?? []).map(item => ({ ...item, url: client.storage.from("food-stories").getPublicUrl(item.media_path).data.publicUrl }));
  if (tenant.data && tenant.data.business_vertical !== "food") return <div className="card mx-auto max-w-2xl p-6"><h1 className="text-2xl font-bold">Истории кафе</h1><p className="muted mt-2">Сейчас публикация историй доступна только магазинам еды. Для других магазинов используйте акции с датами и фото.</p><Link href="/admin/catalog/campaigns" className="btn btn-primary mt-5">Открыть акции</Link></div>;
  return <div className="mx-auto max-w-6xl"><Link href="/admin/catalog" className="text-sm text-[var(--ink-60)]">← Каталог</Link>
    <div className="mb-8 mt-4"><p className="data-label">КАТАЛОГ · ИСТОРИИ</p><h1 className="mt-2 text-3xl font-semibold">Истории кафе</h1><p className="muted mt-2 max-w-2xl">Короткие фото и видео над меню. Добавьте заголовок и, если нужно, переход к блюду. Сначала можно сохранить черновик.</p></div>
    {storyResult.error || !tenant.data ? <p role="alert" className="card p-5">Истории не загрузились. Проверьте подключение и попробуйте обновить страницу.</p> : <StoryEditor tenantId={tenantId!} stories={stories} products={products} storeName={tenant.data.catalog_name||tenant.data.name} storeTagline={tenant.data.tagline} storeLogoUrl={tenant.data.logo_url} businessVertical={tenant.data.business_vertical??"other"} approach={approachForTemplate(settings.data?.template_key??"atelier")} previewSettings={settings.data} previewStyle={storefrontStyle(settings.data,tenant.data.plan,tenant.data.accent_color)} />}
  </div>;
}
