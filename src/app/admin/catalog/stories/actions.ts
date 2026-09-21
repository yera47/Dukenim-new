"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type StoryInput = { id?: string; title: string; caption: string; mediaPath: string; mediaType: "image" | "video"; productId: string | null; status: "draft" | "published"; sortOrder: number };
export async function saveFoodStory(input: StoryInput): Promise<{ error?: string }> {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  if (!tenantId || !input.title.trim() || input.title.trim().length > 80 || input.caption.length > 300 ||
      !input.mediaPath.startsWith(`${tenantId}/`) || !["image", "video"].includes(input.mediaType) ||
      !["draft", "published"].includes(input.status) || !Number.isSafeInteger(input.sortOrder)) return { error: "Проверьте название, файл и настройки истории." };
  const client = await createClient();
  const path = input.mediaPath;
  const { data: media } = await client.storage.from("food-stories").info(path);
  if (!media) return { error: "Файл истории не найден. Загрузите его ещё раз." };
  if (input.productId) {
    const { data: product } = await client.from("products").select("id").eq("id", input.productId).eq("tenant_id", tenantId).eq("is_active", true).maybeSingle();
    if (!product) return { error: "Выбранное блюдо недоступно в этом магазине." };
  }
  const values = { tenant_id: tenantId, title: input.title.trim(), caption: input.caption.trim() || null, media_path: path, media_type: input.mediaType, product_id: input.productId, status: input.status, sort_order: input.sortOrder };
  const previous = input.id ? (await client.from("food_stories").select("media_path").eq("id", input.id).eq("tenant_id", tenantId).maybeSingle()).data : null;
  const result = input.id
    ? await client.from("food_stories").update(values).eq("id", input.id).eq("tenant_id", tenantId).select("id").single()
    : await client.from("food_stories").insert(values).select("id").single();
  if (result.error) return { error: "Не удалось сохранить историю. Проверьте данные и попробуйте снова." };
  if (previous?.media_path && previous.media_path !== path) await client.storage.from("food-stories").remove([previous.media_path]);
  revalidatePath("/admin/catalog/stories");
  revalidatePath("/store-preview");
  const { data: tenant } = await client.from("tenants").select("slug").eq("id", tenantId).single();
  if (tenant) revalidatePath(`/s/${tenant.slug}`);
  return {};
}

export async function deleteFoodStory(id: string): Promise<{ error?: string }> {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  const client = await createClient();
  const { data: story } = await client.from("food_stories").select("media_path").eq("id", id).eq("tenant_id", tenantId!).maybeSingle();
  const { error } = await client.from("food_stories").delete().eq("id", id).eq("tenant_id", tenantId!).select("id").single();
  if (error) return { error: "Не удалось удалить историю." };
  if (story?.media_path) await client.storage.from("food-stories").remove([story.media_path]);
  revalidatePath("/admin/catalog/stories");
  const { data: tenant } = await client.from("tenants").select("slug").eq("id", tenantId!).single();
  if (tenant) revalidatePath(`/s/${tenant.slug}`);
  return {};
}
