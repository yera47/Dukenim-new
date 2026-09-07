import { createClient } from "@/lib/supabase/server";
import { getStorefrontProduct, getStorefrontProducts } from "@/lib/queries/storefront";
import { type Product } from "@/lib/demo-data";
import { demoProductsFor, demoVerticalById } from "@/lib/demo-catalogs";

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
