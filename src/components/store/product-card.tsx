import Link from "next/link";
import { money, type Product } from "@/lib/demo-data";

export function ProductCard({ product, slug }: { product: Product; slug: string }) {
  const style = product.images?.[0] ? { backgroundImage: `url(${product.images[0]})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined;
  return <Link href={`/s/${slug}/product/${product.id}`} className="group block">
    <div style={style} className="product-image aspect-[4/5] rounded-[var(--r-card)] bg-[var(--store-surface)] transition-transform duration-300 group-hover:-translate-y-1">
      <span className="absolute left-3 top-3 z-10 rounded-full bg-[var(--store-surface)]/92 px-3 py-1 text-xs font-bold shadow-sm backdrop-blur">{product.featured ? "Хит" : "Новинка"}</span>
    </div>
    <div className="pt-4"><div className="flex justify-between gap-4"><h3 className="font-bold transition-colors group-hover:text-[var(--tenant-accent)]">{product.title}</h3><span className="whitespace-nowrap font-extrabold">{money(product.price)}</span></div><p className="mt-1 text-sm opacity-60">{product.variants[0]?.color}</p></div>
  </Link>;
}
