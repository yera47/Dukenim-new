import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type FoodStory = {
  id: string;
  title: string;
  caption: string | null;
  mediaUrl: string;
  mediaType: "image" | "video";
  productId: string | null;
};

export async function loadFoodStories(client: SupabaseClient<Database>, tenantId: string, publishedOnly = true): Promise<FoodStory[]> {
  let query = client.from("food_stories").select("id,title,caption,media_path,media_type,product_id").eq("tenant_id", tenantId);
  if (publishedOnly) query = query.eq("status", "published");
  const { data, error } = await query.order("sort_order").order("created_at");
  if (error) throw error;
  return (data ?? []).map(item => ({
    id: item.id, title: item.title, caption: item.caption,
    mediaUrl: client.storage.from("food-stories").getPublicUrl(item.media_path).data.publicUrl,
    mediaType: item.media_type, productId: item.product_id,
  }));
}
