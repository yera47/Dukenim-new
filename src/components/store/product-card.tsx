import Link from "next/link";
import { storefrontPath } from "@/lib/storefront-path";
import { money, type Product } from "@/lib/demo-data";
import { variantLabel } from "@/lib/cart-items";

export function ProductCard({ product, slug }: { product: Product; slug: string }) {
  const available = product.variants.some((variant) => variant.stock > 0);
  const detail = product.variants[0] ? variantLabel(product, product.variants[0].id) : product.category;
  const style = product.images?.[0] ? { backgroundImage: `url(${product.images[0]})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined;
  return <Link href={`${storefrontPath(slug)}/product/${product.id}`} className="group flex h-full min-w-0 flex-col">
    <div style={{...style,borderRadius:"var(--store-card-radius)"}} className="product-image aspect-[4/5] bg-[var(--store-surface)] transition-transform duration-300 group-hover:-translate-y-1">
      {product.featured && <span className="absolute left-3 top-3 z-10 rounded-full bg-[var(--store-surface)] px-3 py-1 text-xs font-bold">Выбор магазина</span>}
    </div>
    <div className="flex flex-1 flex-col pt-3">
      <div className="grid gap-1.5"><h3 className="line-clamp-2 min-h-11 min-w-0 break-words font-bold leading-[1.35] transition-opacity group-hover:opacity-70">{product.title}</h3><span className="whitespace-nowrap font-extrabold">{money(product.price)}</span>{product.oldPrice !== undefined && product.oldPrice > product.price && <s className="text-sm opacity-60" aria-label="Прежняя цена">{money(product.oldPrice)}</s>}</div>
      <p className="mt-1 min-h-5 truncate text-sm opacity-60">{detail || product.category}</p>
      <span className="mt-2 block min-h-4 text-xs font-semibold opacity-60">{available?"В наличии":"Нет в наличии"}</span>
      <span className="mt-auto flex min-h-11 items-center justify-center bg-[var(--tenant-accent)] px-3 text-sm font-extrabold" style={{borderRadius:"var(--store-button-radius)",color:"var(--store-accent-ink)"}}>{available?"Выбрать":"Нет в наличии"}</span>
    </div>
  </Link>;
}
