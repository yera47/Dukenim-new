"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import type { Product } from "@/lib/demo-data";
import type { StoreStory } from "@/lib/food-stories";
import { storefrontPath } from "@/lib/storefront-path";
import styles from "./food-quick-menu.module.css";
import "./food-story-rail.css";

export function FoodStoryRail({ products, slug, name, curatedStories, placement = "collection" }: { products: Product[]; slug: string; name: string; curatedStories?: StoreStory[]; placement?: "collection" | "assortment" | "guided" }) {
  const [story, setStory] = useState<number | null>(null);
  const [viewed, setViewed] = useState<Set<string>>(() => new Set());
  const [paused, setPaused] = useState(false);
  const [mediaState, setMediaState] = useState<"loading" | "ready" | "error">("loading");
  const dialog = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const touchStart = useRef<number | null>(null);
  const stories: StoreStory[] = curatedStories ?? [];
  const current = story === null ? null : stories[story];
  const currentIsVideo = current?.mediaType === "video";
  const base = storefrontPath(slug);
  function open(index:number,button:HTMLButtonElement){trigger.current=button;setViewed(items=>new Set(items).add(stories[index].id));setStory(index);}
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
  useEffect(() => { if (current) setViewed(items=>new Set(items).add(current.id)); }, [current]);
  useEffect(() => { if (story === null || paused || currentIsVideo) return; const timer = window.setTimeout(() => { setStory(index => index === null || index >= stories.length - 1 ? null : index + 1); setPaused(false); }, 6500); return () => window.clearTimeout(timer); }, [story, paused, currentIsVideo, stories.length]);
  useEffect(() => { const video = videoRef.current; if (!video) return; if (paused) video.pause(); else void video.play().catch(() => {}); }, [paused, story]);
  useEffect(() => { if (story !== null) setMediaState("loading"); }, [story]);

  if (!stories.length) return null;
  return <>
    <section aria-labelledby={`stories-${slug}`}><div className="food-stories-heading"><div><p>Обновления магазина</p><h2 id={`stories-${slug}`}>Истории</h2></div><span>{stories.length} свежих</span></div>
      <div className={styles.stories} data-placement={placement}>{stories.map((item, index) => <button key={item.id} className={styles.storyTile} data-viewed={viewed.has(item.id)} aria-label={`Открыть историю: ${item.title}`} onClick={event => open(index,event.currentTarget)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {item.mediaType === "video" ? <video src={`${item.mediaUrl}#t=0.1`} muted playsInline preload="metadata" /> : <img src={item.mediaUrl} alt="" />}
        <span>{item.title}</span><small>{viewed.has(item.id)?"Просмотрено":item.mediaType === "video" ? "Видео" : "Смотреть"}</small>
      </button>)}</div>
    </section>
    <dialog ref={dialog} className={styles.viewer} aria-label="Истории магазина" onCancel={close} onClose={close} onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => { if (event.key === "ArrowRight") next(); if (event.key === "ArrowLeft") setStory(index => Math.max(0, (index ?? 0) - 1)); }}>
      {current && <div className={styles.storyScreen} onTouchStart={event => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={event => { if (touchStart.current === null) return; const distance = event.changedTouches[0].clientX - touchStart.current; touchStart.current = null; if (distance < -45) next(); else if (distance > 45) setStory(index => Math.max(0, (index ?? 0) - 1)); }}>
        {mediaState !== "ready" && <div className={styles.storyMediaState} role="status" aria-live="polite">{mediaState === "error" ? <><b>Медиа не загрузилось</b><span>Закройте историю и попробуйте снова.</span></> : <span>Загружаем историю…</span>}</div>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {current.mediaType === "video" ? <video ref={videoRef} key={current.id} className={styles.storyImage} src={current.mediaUrl} autoPlay muted playsInline onLoadedData={() => setMediaState("ready")} onError={event => { event.currentTarget.style.display = "none"; setMediaState("error"); }} onEnded={next} /> : <img key={current.id} className={styles.storyImage} src={current.mediaUrl} alt={current.title} onLoad={() => setMediaState("ready")} onError={event => { event.currentTarget.style.display = "none"; setMediaState("error"); }} />}
        <div className={styles.progress}>{stories.map((item, index) => <span key={item.id}><i key={`${index}-${story}-${paused}`} className={index === story && !paused && current.mediaType === "image" ? styles.playing : undefined} style={{ width: index < (story ?? 0) ? "100%" : "0" }} /></span>)}</div>
        <div className={styles.storyTop}><b>{name}</b>{mediaState !== "error" && <button onClick={() => setPaused(value => !value)} aria-label={paused ? "Продолжить историю" : "Приостановить историю"}>{paused ? <Play size={18}/> : <Pause size={18}/>}</button>}<button onClick={close} aria-label="Закрыть историю"><X /></button></div>
        <button className={styles.previous} aria-label="Предыдущая история" disabled={story === 0} onClick={() => setStory(index => Math.max(0, (index ?? 0) - 1))}><ChevronLeft /></button>
        <button className={styles.next} aria-label="Следующая история" onClick={next}><ChevronRight /></button>
        <div className={styles.storyCaption}>{current.caption && <span>{current.caption}</span>}<h2>{current.title}</h2>{mediaState !== "error" && current.productId && products.some(product => product.id === current.productId) && <Link href={`${base}/product/${current.productId}`}>Посмотреть товар</Link>}</div>
      </div>}
    </dialog>
  </>;
}
