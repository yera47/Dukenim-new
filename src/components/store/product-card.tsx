import Link from "next/link";
import { money, type Product } from "@/lib/demo-data";

export function ProductCard({ product, slug }: { product: Product; slug: string }) {
  const style = product.images?.[0] ? { backgroundImage: `url(${product.images[0]})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined;
  return <Link href={`/s/${slug}/product/${product.id}`} className="group block">
    <div style={style} className="product-image aspect-[4/5] rounded-[var(--r-card)] bg-[var(--store-surface)] transition-transform duration-300 group-hover:-translate-y-1">
      {product.featured && <span className="absolute left-3 top-3 z-10 rounded-full bg-[var(--store-surface)] px-3 py-1 text-xs font-bold">Выбор магазина</span>}
    </div>
    <div className="pt-4"><div className="flex flex-col gap-2"><h3 className="min-w-0 break-words font-bold transition-opacity group-hover:opacity-70">{product.title}</h3><span className="whitespace-nowrap font-extrabold">{money(product.price)}</span>{product.oldPrice !== undefined && product.oldPrice > product.price && <s className="text-sm opacity-60" aria-label="Прежняя цена">{money(product.oldPrice)}</s>}</div><p className="mt-1 text-sm opacity-60">{product.variants[0]?.color === "Стандарт" ? product.category : product.variants[0]?.color}</p><p className="mt-2 text-xs opacity-70">{product.variants.some(variant=>variant.stock>0)?"В наличии":"Нет в наличии"}</p></div>
  </Link>;
}
