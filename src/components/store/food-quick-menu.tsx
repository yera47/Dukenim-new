"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { money, type Product } from "@/lib/demo-data";
import { emptyCatalogFilters, filterCatalog, type CatalogFilters } from "@/lib/catalog-filter";
import type { StoreStory } from "@/lib/food-stories";
import { storefrontPath } from "@/lib/storefront-path";
import { useCart } from "./cart-provider";
import { FoodProductCard } from "./food-product-card";
import { FoodStoryRail } from "./food-story-rail";
import styles from "./food-quick-menu.module.css";

const appliedCount = (filters: CatalogFilters) => Number(Boolean(filters.category)) + Number(filters.inStock) + Number(filters.sort !== "default");

export function FoodQuickMenu({ products, slug, name, curatedStories, premium = false }: { products: Product[]; slug: string; name: string; curatedStories?: StoreStory[]; premium?: boolean }) {
  const [filters, setFilters] = useState<CatalogFilters>(emptyCatalogFilters);
  const [draft, setDraft] = useState<CatalogFilters>(emptyCatalogFilters);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const { count, total } = useCart();
  const categories = useMemo(() => Array.from(new Set(products.map(product => product.category || "Меню"))), [products]);
  const visible = useMemo(() => filterCatalog(products, filters), [products, filters]);
  const base = storefrontPath(slug);
  const activeCount = appliedCount(filters);
  useEffect(() => { if (searchOpen) requestAnimationFrame(() => searchRef.current?.focus()); }, [searchOpen]);
  useEffect(() => { if (!filtersOpen) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setFiltersOpen(false); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [filtersOpen]);
  const clearAll = () => { setFilters(emptyCatalogFilters); setDraft(emptyCatalogFilters); };

  return <div className={`${styles.root} ${premium ? styles.premium : ""}`}>
    {Boolean(curatedStories?.length) && <FoodStoryRail products={products} slug={slug} name={name} curatedStories={curatedStories} placement={premium ? "collection" : "assortment"} />}
    {!premium && <nav className={styles.categories} aria-label="Категории меню"><button type="button" aria-pressed={!filters.category} onClick={() => setFilters(value => ({ ...value, category: "" }))}>Все</button>{categories.map(category => <button key={category} type="button" aria-pressed={filters.category === category} onClick={() => setFilters(value => ({ ...value, category }))}>{category}</button>)}</nav>}
    <div className={`${styles.menuHeading} ${searchOpen ? styles.menuHeadingSearch : ""}`}>
      <div><h1>Меню</h1><span>{name}</span></div>
      <div className={styles.toolbar} aria-label="Поиск и фильтры меню">
        <div className={`${styles.searchBox} ${searchOpen ? styles.searchBoxOpen : ""}`}>
          {searchOpen ? <><Search size={18} aria-hidden="true"/><label className="sr-only" htmlFor="food-search">Поиск по меню</label><input ref={searchRef} id="food-search" type="search" placeholder="Блюдо или состав" value={filters.query} onChange={event => setFilters(value => ({ ...value, query: event.target.value }))}/><button type="button" aria-label={filters.query ? "Очистить поиск" : "Закрыть поиск"} onClick={() => filters.query ? setFilters(value => ({ ...value, query: "" })) : setSearchOpen(false)}><X size={18}/></button></> : <button type="button" onClick={() => setSearchOpen(true)} aria-expanded={searchOpen}><Search size={18}/>Поиск</button>}
        </div>
        {!searchOpen && <button type="button" className={styles.toolButton} aria-expanded={filtersOpen} aria-controls="food-filters" onClick={() => { setDraft(filters); setFiltersOpen(true); }}><SlidersHorizontal size={18}/>Фильтры{activeCount > 0 && <span aria-label={`Активных фильтров: ${activeCount}`}>{activeCount}</span>}</button>}
      </div>
    </div>
    {filtersOpen && <><button type="button" className={styles.backdrop} aria-label="Закрыть фильтры" onClick={() => setFiltersOpen(false)}/><section id="food-filters" role="dialog" aria-modal="true" aria-labelledby="food-filter-title" className={styles.filterPanel}>
      <div className={styles.filterTitle}><div><h2 id="food-filter-title">Фильтры</h2><p>Изменения применятся после подтверждения</p></div><button type="button" aria-label="Закрыть фильтры" onClick={() => setFiltersOpen(false)}><X size={20}/></button></div>
      {categories.length > 1 && <label>Категория<select value={draft.category} onChange={event => setDraft(value => ({ ...value, category: event.target.value }))}><option value="">Все категории</option>{categories.map(category => <option key={category}>{category}</option>)}</select></label>}
      <label>Порядок<select value={draft.sort} onChange={event => setDraft(value => ({ ...value, sort: event.target.value as CatalogFilters["sort"] }))}><option value="default">Как в меню</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option></select></label>
      <label className={styles.check}><input type="checkbox" checked={draft.inStock} onChange={event => setDraft(value => ({ ...value, inStock: event.target.checked }))}/>Только в наличии</label>
      <div className={styles.filterActions}><button type="button" onClick={() => setDraft({ ...emptyCatalogFilters, query: filters.query })}>Сбросить</button><button type="button" onClick={() => { setFilters(draft); setFiltersOpen(false); }}><Check size={18}/>Применить</button></div>
    </section></>}
    {categories.map((category, index) => { const items = visible.filter(product => (product.category || "Меню") === category); return items.length > 0 && <section key={category} id={`food-section-${index}`} className={styles.section}><h2>{category}</h2><div className={styles.grid}>{items.map(product => <FoodProductCard key={product.id} product={product} slug={slug}/>)}</div></section>; })}
    {visible.length === 0 && <div className={styles.empty}><strong>{products.length ? "Ничего не найдено" : "Меню пока пустое"}</strong><p>{products.length ? "Попробуйте другой запрос или сбросьте фильтры." : "Заведение добавляет первые блюда и напитки."}</p>{products.length > 0 && <button type="button" onClick={clearAll}>Сбросить все фильтры</button>}</div>}
    {count > 0 && <a className={styles.cart} href={`${base}/cart`}><ShoppingBag size={20}/><span>Корзина · {count}</span><strong>{money(total)}</strong></a>}
  </div>;
}
