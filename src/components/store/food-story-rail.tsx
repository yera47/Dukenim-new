"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Product } from "@/lib/demo-data";
import type { FoodStory } from "@/lib/food-stories";
import { storefrontPath } from "@/lib/storefront-path";
import styles from "./food-quick-menu.module.css";

export function FoodStoryRail({ products, slug, name, curatedStories }: { products: Product[]; slug: string; name: string; curatedStories?: FoodStory[] }) {
  const [story, setStory] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const touchStart = useRef<number | null>(null);
  const stories: FoodStory[] = curatedStories ?? products.filter(product => product.images?.[0]).slice(0, 6).map(product => ({ id: product.id, title: product.title, caption: product.category, mediaUrl: product.images![0], mediaType: "image", productId: product.id }));
  const current = story === null ? null : stories[story];
  const currentIsVideo = current?.mediaType === "video";
  const base = storefrontPath(slug);
  function close() { setStory(null); setPaused(false); }
  function next() { setStory(index => index === null || index >= stories.length - 1 ? null : index + 1); setPaused(false); }

  useEffect(() => {
    if (story === null) { dialog.current?.close(); trigger.current?.focus(); return; }
    const node = dialog.current;
    if (node && !node.open) node.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [story]);
  useEffect(() => {
    if (story === null || paused || currentIsVideo) return;
    const timer = window.setTimeout(() => setStory(index => index === null || index >= stories.length - 1 ? null : index + 1), 6500);
    return () => window.clearTimeout(timer);
  }, [story, paused, stories.length, currentIsVideo]);
  useEffect(() => { const video = videoRef.current; if (!video) return; if (paused) video.pause(); else void video.play().catch(() => {}); }, [paused, story]);

  if (!stories.length) return null;
  return <>
    <section className={styles.stories} aria-label="Истории кафе">{stories.map((item, index) => <button key={item.id} className={styles.storyTile} aria-label={`Открыть историю: ${item.title}`} onClick={event => { trigger.current = event.currentTarget; setStory(index); }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {item.mediaType === "video" ? <video src={`${item.mediaUrl}#t=0.1`} muted playsInline preload="metadata" /> : <img src={item.mediaUrl} alt="" />}
      <span>{item.title}</span><small>{item.mediaType === "video" ? "▶ Видео" : "Смотреть ↗"}</small>
    </button>)}</section>
    <dialog ref={dialog} className={styles.viewer} aria-label="История меню" onCancel={close} onClose={close} onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => { if (event.key === "ArrowRight") next(); if (event.key === "ArrowLeft") setStory(index => Math.max(0, (index ?? 0) - 1)); }}>
      {current && <div className={styles.storyScreen} onTouchStart={event => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={event => { if (touchStart.current === null) return; const distance = event.changedTouches[0].clientX - touchStart.current; touchStart.current = null; if (distance < -45) next(); else if (distance > 45) setStory(index => Math.max(0, (index ?? 0) - 1)); }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {current.mediaType === "video" ? <video ref={videoRef} key={current.id} className={styles.storyImage} src={current.mediaUrl} autoPlay muted playsInline onEnded={next} /> : <img className={styles.storyImage} src={current.mediaUrl} alt={current.title} />}
        <div className={styles.progress}>{stories.map((item, index) => <span key={item.id}><i key={`${index}-${story}-${paused}`} className={index === story && !paused && current.mediaType === "image" ? styles.playing : undefined} style={{ width: index < (story ?? 0) ? "100%" : "0" }} /></span>)}</div>
        <div className={styles.storyTop}><b>{name}</b><button onClick={() => setPaused(value => !value)} aria-label={paused ? "Продолжить историю" : "Приостановить историю"}>{paused ? "▶" : "Ⅱ"}</button><button onClick={close} aria-label="Закрыть историю"><X /></button></div>
        <button className={styles.previous} aria-label="Предыдущая история" disabled={story === 0} onClick={() => setStory(index => Math.max(0, (index ?? 0) - 1))}><ChevronLeft /></button>
        <button className={styles.next} aria-label="Следующая история" onClick={next}><ChevronRight /></button>
        <div className={styles.storyCaption}>{current.caption && <span>{current.caption}</span>}<h2>{current.title}</h2>{current.productId && products.some(product => product.id === current.productId) && <Link href={`${base}/product/${current.productId}`}>Посмотреть блюдо →</Link>}</div>
      </div>}
    </dialog>
  </>;
}
