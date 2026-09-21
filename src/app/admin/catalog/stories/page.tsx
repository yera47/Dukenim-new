import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StoryEditor, type EditorStory } from "./story-editor";

export default async function FoodStoriesPage() {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  const client = await createClient();
  const [tenant, storyResult, productResult] = await Promise.all([
    client.from("tenants").select("business_vertical").eq("id", tenantId!).single(),
    client.from("food_stories").select("id,title,caption,media_path,media_type,product_id,status,sort_order").eq("tenant_id", tenantId!).order("sort_order").order("created_at"),
    client.from("products").select("id,title").eq("tenant_id", tenantId!).eq("is_active", true).order("title"),
  ]);
  if (tenant.data?.business_vertical !== "food") notFound();
  const stories: EditorStory[] = (storyResult.data ?? []).map(item => ({ ...item, url: client.storage.from("food-stories").getPublicUrl(item.media_path).data.publicUrl }));
  return <div className="mx-auto max-w-6xl"><Link href="/admin/catalog" className="text-sm text-[var(--ink-60)]">← Каталог</Link>
    <div className="mb-8 mt-4"><p className="data-label">КАТАЛОГ · ЕДА</p><h1 className="mt-2 text-3xl font-semibold">Истории кафе</h1><p className="muted mt-2 max-w-2xl">Короткие фото и видео над меню. Добавьте заголовок и, если нужно, кнопку перехода к блюду. Новая история сначала может оставаться черновиком.</p></div>
    {storyResult.error ? <p role="alert" className="card p-5">Истории не загрузились. Проверьте подключение и попробуйте обновить страницу.</p> : <StoryEditor tenantId={tenantId!} stories={stories} products={productResult.data ?? []} />}
  </div>;
}
