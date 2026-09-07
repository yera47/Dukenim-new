import { createClient } from "@/lib/supabase/server";
import { getStorefrontProduct, getStorefrontProducts } from "@/lib/queries/storefront";
import { products as demoProducts, type Product } from "@/lib/demo-data";
import { DEMO_TENANT_ID } from "@/lib/tenant";

export async function loadProducts(tenantId: string): Promise<Product[]> {
  if (tenantId === DEMO_TENANT_ID || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return demoProducts;
  return getStorefrontProducts(await createClient(), tenantId);
}

export async function loadProduct(tenantId: string, productId: string): Promise<Product | null> {
  if (tenantId === DEMO_TENANT_ID || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return demoProducts.find(product => product.id === productId) ?? null;
  return getStorefrontProduct(await createClient(), tenantId, productId);
}
