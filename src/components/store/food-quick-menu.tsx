"use client";

import { useState } from "react";
import { Search, ShoppingBag } from "lucide-react";
import { money, type Product } from "@/lib/demo-data";
import type { FoodStory } from "@/lib/food-stories";
import { storefrontPath } from "@/lib/storefront-path";
import { useCart } from "./cart-provider";
import { FoodProductCard } from "./food-product-card";
import { FoodStoryRail } from "./food-story-rail";
import styles from "./food-quick-menu.module.css";

export function FoodQuickMenu({ products, slug, name, curatedStories }: { products: Product[]; slug: string; name: string; curatedStories?: FoodStory[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const { count, total } = useCart();
  const categories = Array.from(new Set(products.map(product => product.category || "Меню")));
  const visible = products.filter(product => `${product.title} ${product.description ?? ""}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const base = storefrontPath(slug);

  return <div className={styles.root}>
    <FoodStoryRail products={products} slug={slug} name={name} curatedStories={curatedStories} />
    <nav className={styles.categories} aria-label="Разделы меню">{categories.map((category, index) => <a key={category} href={`#food-section-${index}`} aria-current={active === index ? "true" : undefined} onClick={() => setActive(index)}>{category}</a>)}</nav>
    <div className={styles.menuHeading}><div><h1>Меню</h1><span>{products.length} позиций · {name}</span></div><label className={styles.search}><Search size={18} /><input type="search" aria-label="Найти блюдо" placeholder="Найти блюдо" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
    {categories.map((category, index) => { const items = visible.filter(product => (product.category || "Меню") === category); return items.length > 0 && <section key={category} id={`food-section-${index}`} className={styles.section}><h2>{category}</h2><div className={styles.grid}>{items.map(product => <FoodProductCard key={product.id} product={product} slug={slug} />)}</div></section>; })}
    {visible.length === 0 && <p className={styles.empty}>{products.length ? "Ничего не найдено. Попробуйте другое название." : "Заведение добавляет первые блюда и напитки."}</p>}
    {count > 0 && <a className={styles.cart} href={`${base}/cart`}><ShoppingBag size={20} /><span>Корзина · {count}</span><strong>{money(total)}</strong></a>}
  </div>;
}
