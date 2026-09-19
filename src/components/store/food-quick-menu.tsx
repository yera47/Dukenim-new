"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search, ShoppingBag, X } from "lucide-react";
import { money, type Product } from "@/lib/demo-data";
import { storefrontPath } from "@/lib/storefront-path";
import { useCart } from "./cart-provider";
import { FoodProductCard } from "./food-product-card";
import styles from "./food-quick-menu.module.css";

export function FoodQuickMenu({products,slug,name}:{products:Product[];slug:string;name:string}) {
  const [query,setQuery]=useState("");
  const [story,setStory]=useState<number|null>(null);
  const [paused,setPaused]=useState(false);
  const [active,setActive]=useState(0);
  const dialog=useRef<HTMLDialogElement>(null);
  const trigger=useRef<HTMLButtonElement|null>(null);
  const touchStart=useRef<number|null>(null);
  const {count,total}=useCart();
  const stories=products.filter(product=>product.images?.[0]).slice(0,6);
  const categories=Array.from(new Set(products.map(product=>product.category||"Меню")));
  const visible=products.filter(product=>`${product.title} ${product.description??""}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const base=storefrontPath(slug);
  const current=story===null?null:stories[story];
  function close(){setStory(null);setPaused(false);}
  function next(){setStory(index=>index===null||index>=stories.length-1?null:index+1);setPaused(false);}

  useEffect(()=>{
    if(story===null){dialog.current?.close();trigger.current?.focus();return;}
    const node=dialog.current;
    if(node&&!node.open)node.showModal();
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return ()=>{document.body.style.overflow=previous;};
  },[story]);
  useEffect(()=>{
    if(story===null||paused)return;
    const timer=window.setTimeout(()=>setStory(index=>index===null||index>=stories.length-1?null:index+1),6500);
    return ()=>window.clearTimeout(timer);
  },[story,paused,stories.length]);

  return <div className={styles.root}>
    {stories.length>0&&<section className={styles.stories} aria-label="Истории меню">{stories.map((product,index)=><button key={product.id} className={styles.storyTile} aria-label={`Открыть историю: ${product.title}`} onClick={event=>{trigger.current=event.currentTarget;setStory(index);}}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={product.images![0]} alt=""/><span>{product.title}</span><small>Смотреть ↗</small>
    </button>)}</section>}
    <nav className={styles.categories} aria-label="Разделы меню">{categories.map((category,index)=><a key={category} href={`#food-section-${index}`} aria-current={active===index?"true":undefined} onClick={()=>setActive(index)}>{category}</a>)}</nav>
    <div className={styles.menuHeading}><div><h1>Меню</h1><span>{products.length} позиций · {name}</span></div><label className={styles.search}><Search size={18}/><input type="search" aria-label="Найти блюдо" placeholder="Найти блюдо" value={query} onChange={event=>setQuery(event.target.value)}/></label></div>
    {categories.map((category,index)=>{const items=visible.filter(product=>(product.category||"Меню")===category);return items.length>0&&<section key={category} id={`food-section-${index}`} className={styles.section}><h2>{category}</h2><div className={styles.grid}>{items.map(product=><FoodProductCard key={product.id} product={product} slug={slug}/>)}</div></section>;})}
    {visible.length===0&&<p className={styles.empty}>{products.length?"Ничего не найдено. Попробуйте другое название.":"Заведение добавляет первые блюда и напитки."}</p>}
    {count>0&&<Link className={styles.cart} href={`${base}/cart`}><ShoppingBag size={20}/><span>Корзина · {count}</span><strong>{money(total)}</strong></Link>}
    <dialog ref={dialog} className={styles.viewer} aria-label="История меню" onCancel={close} onClose={close} onClick={event=>{if(event.target===event.currentTarget)close();}} onKeyDown={event=>{if(event.key==="ArrowRight")next();if(event.key==="ArrowLeft")setStory(index=>Math.max(0,(index??0)-1));}}>
      {current&&<div className={styles.storyScreen} onTouchStart={event=>{touchStart.current=event.touches[0].clientX;}} onTouchEnd={event=>{if(touchStart.current===null)return;const distance=event.changedTouches[0].clientX-touchStart.current;touchStart.current=null;if(distance< -45)next();else if(distance>45)setStory(index=>Math.max(0,(index??0)-1));}}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.storyImage} src={current.images![0]} alt={current.title}/>
        <div className={styles.progress}>{stories.map((product,index)=><span key={product.id}><i key={`${index}-${story}-${paused}`} className={index===story&&!paused?styles.playing:undefined} style={{width:index<(story??0)?"100%":"0"}}/></span>)}</div>
        <div className={styles.storyTop}><b>{name}</b><button onClick={()=>setPaused(value=>!value)} aria-label={paused?"Продолжить историю":"Приостановить историю"}>{paused?"▶":"Ⅱ"}</button><button onClick={close} aria-label="Закрыть историю"><X/></button></div>
        <button className={styles.previous} aria-label="Предыдущая история" disabled={story===0} onClick={()=>setStory(index=>Math.max(0,(index??0)-1))}><ChevronLeft/></button>
        <button className={styles.next} aria-label="Следующая история" onClick={next}><ChevronRight/></button>
        <div className={styles.storyCaption}><span>{current.category}</span><h2>{current.title}</h2><strong>{money(current.price)}</strong><Link href={`${base}/product/${current.id}`}>Посмотреть блюдо →</Link></div>
      </div>}
    </dialog>
  </div>;
}
