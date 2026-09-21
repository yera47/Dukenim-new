import { createClient } from "@/lib/supabase/server";
import { getStorefrontProduct, getStorefrontProducts } from "@/lib/queries/storefront";
import { type Product } from "@/lib/demo-data";
import { demoProductsFor, demoVerticalById } from "@/lib/demo-catalogs";

export async function loadStoreCategories(tenantId: string): Promise<string[]> {
  const vertical = demoVerticalById(tenantId);
  if (vertical) return [...new Set(demoProductsFor(vertical).map(product => product.category).filter(Boolean))];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return [];
  const client = await createClient();
  const [products, categories] = await Promise.all([
    client.from("products").select("category_id").eq("tenant_id", tenantId).eq("is_active", true).order("sort_order"),
    client.from("categories").select("id,name").eq("tenant_id", tenantId).eq("is_active", true),
  ]);
  if (products.error) throw products.error;
  if (categories.error) throw categories.error;
  const names = new Map((categories.data ?? []).map(category => [category.id, category.name]));
  return [...new Set((products.data ?? []).map(product => product.category_id && names.get(product.category_id) || "Каталог"))];
}

export async function loadProducts(tenantId: string): Promise<Product[]> {
  const vertical = demoVerticalById(tenantId);
  if (vertical) return demoProductsFor(vertical);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return [];
  return getStorefrontProducts(await createClient(), tenantId);
}

export async function loadProduct(tenantId: string, productId: string): Promise<Product | null> {
  const vertical = demoVerticalById(tenantId);
  if (vertical) return demoProductsFor(vertical).find(product => product.id === productId) ?? null;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  return getStorefrontProduct(await createClient(), tenantId, productId);
}
