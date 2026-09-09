import type { Product } from "./demo-data";

export type CatalogFilters = { query: string; category: string; size: string; inStock: boolean; sort: "default" | "price-asc" | "price-desc" };
export const emptyCatalogFilters: CatalogFilters = { query:"", category:"", size:"", inStock:false, sort:"default" };
export function filterCatalog(products: Product[], filters: CatalogFilters) {
  const words = filters.query.trim().toLocaleLowerCase("ru").split(/\s+/).filter(Boolean);
  const result = products.filter(product => {
    const text = `${product.title} ${product.description} ${product.category}`.toLocaleLowerCase("ru");
    if (!words.every(word => text.includes(word))) return false;
    if (filters.category && product.category !== filters.category) return false;
    // Size and availability must match the SAME variant, not two unrelated variants.
    return product.variants.some(variant => (!filters.size || variant.size === filters.size) && (!filters.inStock || variant.stock > 0)) || (!filters.size && !filters.inStock && !product.variants.length);
  });
  if (filters.sort !== "default") result.sort((a,b) => filters.sort === "price-asc" ? a.price-b.price : b.price-a.price);
  return result;
}
