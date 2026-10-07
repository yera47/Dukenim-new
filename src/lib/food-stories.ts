import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { storyIsVisible } from "@/lib/story-lifecycle";

export type StoreStory = {
  id: string;
  title: string;
  caption: string | null;
  mediaUrl: string;
  mediaType: "image" | "video";
  productId: string | null;
};

export type FoodStory = StoreStory;

export async function loadStoreStories(client: SupabaseClient<Database>, tenantId: string, publishedOnly = true, now = Date.now()): Promise<StoreStory[]> {
  let query = client.from("food_stories").select("id,title,caption,media_path,media_type,product_id,status,updated_at").eq("tenant_id", tenantId);
  if (publishedOnly) query = query.eq("status", "published");
  const { data, error } = await query.order("sort_order").order("created_at");
  if (error) throw error;
  return (data ?? []).filter(item => !publishedOnly || storyIsVisible(item, now)).map(item => ({
    id: item.id, title: item.title, caption: item.caption,
    mediaUrl: client.storage.from("food-stories").getPublicUrl(item.media_path).data.publicUrl,
    mediaType: item.media_type, productId: item.product_id,
  }));
}

// Kept while existing call sites and the deployed table retain their legacy name.
export const loadFoodStories = loadStoreStories;
