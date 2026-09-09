import Link from "next/link";
import {ArrowRight} from "lucide-react";
import type {Product} from "@/lib/demo-data";
import {storefrontPath} from "@/lib/storefront-path";
import styles from "./editorial-cover.module.css";

// Each vertical has its own cover composition. Only merchant-supplied facts/images
// enter the cover; an empty catalog never borrows photographs from demo shops.
export function EditorialCover({vertical,title,subtitle,cta,heroImage,products,slug}:{vertical:string;title:string;subtitle:string;cta:string;heroImage:string|null;products:Product[];slug:string}){
 const illustrated=products.filter(product=>product.images?.[0]);
 const lead=illustrated[0],second=illustrated[1];
 const image=heroImage??lead?.images?.[0];
 const href=storefrontPath(slug);
 const picture=image?<figure className={styles.picture}>
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src={image} alt={heroImage?title:lead?.title??title} fetchPriority="high"/>
  {!heroImage&&lead&&<figcaption><Link href={`${href}/product/${lead.id}`}>{lead.title}<ArrowRight size={16}/></Link></figcaption>}
 </figure>:null;
 const text=<div className={styles.copy}><h1>{title}</h1><p>{subtitle}</p><Link style={{color:"var(--store-accent-ink)"}} className={styles.cta} href={`${href}/catalog`}>{cta}<ArrowRight size={18}/></Link></div>;
 const companion=second&&<Link className={styles.companion} href={`${href}/product/${second.id}`}>
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src={second.images![0]} alt={second.title} loading="lazy"/><span>{second.title} →</span>
 </Link>;
 return <section className={`container storefront-hero-grid ${styles.cover}`} data-cover={vertical} data-illustrated={Boolean(image)}>
  {vertical==="fashion"?<>{picture}{text}</>:
   vertical==="beauty"?<>{text}<div className={styles.duet}>{picture}{companion}</div></>:
   vertical==="food"?<>{text}{picture}</>:
   vertical==="flowers"?<>{picture}<div className={styles.flowerStory}>{text}{companion}</div></>:
   vertical==="home"?<>{text}{picture}</>:
   <>{text}<div className={styles.duet}>{picture}{companion}</div></>}
 </section>;
}
