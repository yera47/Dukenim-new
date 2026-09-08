import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ProductRow, VariantRow } from "@/types/database";
import type { Product } from "@/lib/demo-data";

export async function getStorefrontProducts(client: SupabaseClient<Database>, tenantId: string): Promise<Product[]> {
  const [products, variants, categories] = await Promise.all([
    client.from("products").select("*").eq("tenant_id", tenantId).eq("is_active", true).order("sort_order"),
    client.from("product_variants").select("*").eq("tenant_id", tenantId).eq("is_active", true),
    client.from("categories").select("id,name").eq("tenant_id", tenantId).eq("is_active", true),
  ]);
  if (products.error) throw products.error;
  if (variants.error) throw variants.error;
  if (categories.error) throw categories.error;
  const names = new Map((categories.data ?? []).map(category => [category.id, category.name]));
  const byProduct = new Map<string, VariantRow[]>();
  for (const variant of variants.data ?? []) {
    const list = byProduct.get(variant.product_id) ?? [];
    list.push(variant); byProduct.set(variant.product_id, list);
  }
  return (products.data ?? []).map(product => mapStorefrontProduct(product, byProduct.get(product.id) ?? [], names));
}

export async function getStorefrontProduct(client: SupabaseClient<Database>, tenantId: string, productId: string): Promise<Product | null> {
  const { data: product, error } = await client.from("products").select("*").eq("tenant_id", tenantId).eq("id", productId).eq("is_active", true).maybeSingle();
  if (error) throw error;
  if (!product) return null;
  const [variants, categories] = await Promise.all([
    client.from("product_variants").select("*").eq("tenant_id", tenantId).eq("product_id", productId).eq("is_active", true),
    client.from("categories").select("id,name").eq("tenant_id", tenantId).eq("is_active", true),
  ]);
  if (variants.error) throw variants.error;
  if (categories.error) throw categories.error;
  return mapStorefrontProduct(product, variants.data ?? [], new Map((categories.data ?? []).map(category => [category.id, category.name])));
}

export function mapStorefrontProduct(product: ProductRow, variants: VariantRow[], categoryNames: ReadonlyMap<string, string>): Product {
  return { id: product.id, title: product.title, description: product.description ?? "", price: product.price,
    oldPrice: product.old_price ?? undefined, category: (product.category_id && categoryNames.get(product.category_id)) || "Каталог",
    featured: product.is_featured, images: product.images,
    variants: variants.map(variant => ({ id: variant.id, size: variant.size, color: variant.color ?? "", stock: variant.stock_qty })) };
}
