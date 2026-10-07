import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/lib/demo-data";
import { storefrontPath } from "@/lib/storefront-path";
import styles from "./editorial-cover.module.css";

type Props = { vertical: string; title: string; subtitle: string; cta: string; heroImage: string | null; products: Product[]; slug: string; templateKey?: string | null };

// Merchant content only: an empty real catalog never borrows demo photography.
export function EditorialCover({ vertical, title, subtitle, cta, heroImage, products, slug, templateKey = "atelier" }: Props) {
  const illustrated = products.filter((product) => product.images?.[0]);
  const href = storefrontPath(slug);
  const picture = heroImage
    ? <figure className={styles.picture} data-hero-source="brand"><Image src={heroImage} alt={title} width={1200} height={1200} unoptimized priority /></figure>
    : <figure className={`${styles.picture} ${styles.placeholder}`} data-hero-source="placeholder" data-asset-needed="brand-hero" aria-label="Обложка бренда ещё не выбрана"><span aria-hidden="true" /></figure>;
  const text = <div className={styles.copy}><h1>{title}</h1><p>{subtitle}</p><Link style={{ background: "var(--tenant-accent)", color: "var(--store-accent-ink)" }} className={styles.cta} href={`${href}/catalog`}>{cta}<ArrowRight size={18} /></Link></div>;

  if (templateKey === "journal") return <section className={`container ${styles.templateCover} ${styles.journal}`} data-cover={vertical} data-template-cover="journal"><div className={styles.journalHeading}><span>Глава 01 · Новая коллекция</span><h1>{title}</h1><p>{subtitle}</p></div>{picture}<Link className={styles.journalCta} href={`${href}/catalog`}>{cta}<ArrowRight size={18} /></Link></section>;
  if (templateKey === "gallery") return <section className={`container ${styles.templateCover} ${styles.gallery}`} data-cover={vertical} data-template-cover="gallery"><div className={styles.galleryHeading}><span>Выбор редакции</span><h1>{title}</h1><Link href="#catalog">Смотреть товары <ArrowRight size={17} /></Link></div><div className={styles.mosaic}>{illustrated.slice(0, 3).map((product, index) => <Link key={product.id} href={`${href}/product/${product.id}`} data-lead={index === 0}><Image src={product.images![0]} alt={product.title} width={720} height={900} unoptimized /></Link>)}</div></section>;
  if (templateKey === "signature") return <section className={`container ${styles.templateCover} ${styles.signature}`} data-cover={vertical} data-template-cover="signature">{picture}<div className={styles.signatureCopy}><span>Signature · {vertical}</span><h1>{title}</h1><p>{subtitle}</p><Link className={styles.cta} href={`${href}/catalog`}>{cta}<ArrowRight size={18} /></Link></div><i aria-hidden="true" className={styles.brandGraphic} /></section>;
  return <section className={`container storefront-hero-grid ${styles.cover}`} data-cover={vertical} data-illustrated={Boolean(heroImage)} data-template-cover={templateKey}>
    {vertical === "fashion" ? <>{picture}{text}</> : vertical === "beauty" ? <>{text}<div className={styles.duet}>{picture}</div></> : vertical === "food" ? <>{text}{picture}</> : vertical === "flowers" ? <>{picture}<div className={styles.flowerStory}>{text}</div></> : vertical === "home" ? <>{text}{picture}</> : <>{text}<div className={styles.duet}>{picture}</div></>}
    <div className={styles.templateMosaic} aria-label="Визуальная подборка">{illustrated.slice(0, 3).map((product) => <Link key={product.id} href={`${href}/product/${product.id}`}><Image src={product.images![0]} alt={product.title} width={720} height={900} unoptimized /></Link>)}</div>
  </section>;
}
