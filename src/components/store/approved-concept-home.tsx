import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import type { Product } from "@/lib/demo-data";
import type { BusinessVertical } from "@/types/database";
import { CatalogBrowser } from "./catalog-browser";
import { storefrontPath } from "@/lib/storefront-path";
import styles from "./approved-concept-home.module.css";

type ConceptVertical = Extract<BusinessVertical, "fashion" | "beauty" | "flowers" | "home" | "other">;
type ConceptCopy = { eyebrow: string; title: string; subtitle: string; cta: string; catalog: string; stories: string[] };

const conceptCopy: Record<ConceptVertical, ConceptCopy> = {
  fashion: { eyebrow: "Новая коллекция", title: "Форма каждого дня", subtitle: "Чёткий крой, спокойные оттенки и вещи, которые работают вместе.", cta: "Смотреть коллекцию", catalog: "Новое и главное", stories: ["Крой и движение", "Цвет и пространство", "Детали образа"] },
  beauty: { eyebrow: "Уход по шагам", title: "Простой ритуал", subtitle: "Формулы и текстуры для спокойного ежедневного ухода.", cta: "Выбрать уход", catalog: "Уход по шагам", stories: ["Как выбрать уход", "Вечерний ритуал", "Текстуры сезона"] },
  flowers: { eyebrow: "Свежие букеты", title: "Цветы говорят сами", subtitle: "Соберём сегодня и доставим в выбранный день.", cta: "Выбрать букет", catalog: "Букеты", stories: ["В мастерской", "Палитра недели", "Как мы собираем"] },
  home: { eyebrow: "Дом и детали", title: "Тихий дом", subtitle: "Натуральные фактуры, тёплый свет и предметы с понятными размерами.", cta: "Смотреть каталог", catalog: "Всё для дома", stories: ["Цвет и фактура", "Свет для вечера", "Детали крупным планом"] },
  other: { eyebrow: "Авторская мастерская", title: "Сделано своим путём", subtitle: "Работы, материалы и предметы в одном аккуратном каталоге.", cta: "Смотреть детали", catalog: "Мастерская", stories: ["Люди и процесс", "История вещи", "О материале", "Интерьер"] },
};

function StoryRail({ products, slug, labels }: { products: Product[]; slug: string; labels: string[] }) {
  const pictured = products.filter(product => product.images?.[0]).slice(0, labels.length);
  if (!pictured.length) return null;
  const base = storefrontPath(slug);
  return <section className={styles.stories} aria-labelledby="approved-stories-title">
    <header><h2 id="approved-stories-title">Истории</h2><Link href={`${base}/catalog`}>Все истории <ArrowRight size={16}/></Link></header>
    <div>{pictured.map((product, index) => <Link key={product.id} href={`${base}/product/${product.id}`}><Image src={product.images![0]} alt="" width={720} height={440} unoptimized/><span>{labels[index] ?? product.title}</span></Link>)}</div>
  </section>;
}

export function ApprovedConceptHome({ vertical, products, slug, heroImage }: { vertical: ConceptVertical; products: Product[]; slug: string; heroImage: string | null }) {
  const copy = conceptCopy[vertical];
  const base = storefrontPath(slug);
  const hero = <section className={styles.hero} aria-labelledby="approved-concept-title">
    <div className={styles.heroCopy}><span>{copy.eyebrow}</span><h1 id="approved-concept-title">{copy.title}</h1><p>{copy.subtitle}</p><a href="#catalog">{copy.cta} <ArrowRight size={18}/></a></div>
    {heroImage ? <div className={styles.heroImage} data-hero-source="brand"><Image src={heroImage} alt="" width={1200} height={900} priority unoptimized/></div> : <div className={styles.missingHero} data-hero-source="placeholder" data-asset-needed="brand-hero" aria-label="Брендовое изображение пока не загружено">{vertical === "fashion" ? <div className={styles.fashionEditorial} aria-hidden="true"><b>FORMA</b><span>NEW / 01</span><i/><i/></div> : <span aria-hidden="true">{copy.title.slice(0, 1)}</span>}</div>}
  </section>;
  const catalog = <section id="catalog" className={styles.catalog} aria-labelledby="approved-catalog-title"><header className={styles.catalogTitle}><h2 id="approved-catalog-title">{copy.catalog}</h2></header><CatalogBrowser products={products} slug={slug} approach="collection" filterLabel="Фильтры и сортировка"/></section>;

  return <main className={styles.root} data-approved-concept={vertical} data-vertical={vertical}>
    {vertical === "flowers" && <div className={styles.deliveryContext} aria-label="Параметры доставки"><button type="button"><MapPin size={18}/> Доставка в ваш район</button><button type="button"><CalendarDays size={18}/> Сегодня и в нужный день</button></div>}
    <div className={styles.primary}>{hero}{catalog}</div>
    <StoryRail products={products} slug={slug} labels={copy.stories}/>
    <div className={styles.bottomAction}><Link href={`${base}/catalog`}>Смотреть весь каталог <ArrowRight size={17}/></Link></div>
  </main>;
}
