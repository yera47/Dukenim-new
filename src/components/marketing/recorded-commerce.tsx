"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import styles from "./recorded-commerce.module.css";

export function RecordedCommerce(){
  const phone=useRef<HTMLVideoElement>(null);
  const desktop=useRef<HTMLVideoElement>(null);
  const [paused,setPaused]=useState(false);
  async function toggle(){
    if(paused){
      const results=await Promise.allSettled([phone.current?.play(),desktop.current?.play()]);
      setPaused(results.some(result=>result.status==="rejected"));
    }else{phone.current?.pause();desktop.current?.pause();setPaused(true);}
  }
  return <div className={styles.block}>
    <div className={styles.devices}>
      <div className={styles.phone}><video ref={phone} muted autoPlay loop playsInline preload="metadata" aria-label="Запись витрины Dukenim на телефоне"><source src="/design/serik-storefront-recording.webm" type="video/webm"/></video></div>
      <div className={styles.desktop}><div className={styles.chrome}><i/><i/><i/><span>Dukenim · Заказы</span></div><video ref={desktop} muted autoPlay loop playsInline preload="metadata" aria-label="Запись рабочего кабинета Dukenim"><source src="/design/serik-workspace-recording.webm" type="video/webm"/></video></div>
    </div>
    <div className={styles.caption}><p>Реальный путь: товар → корзина → оформление. Справа — каталог, аналитика и заказы владельца.</p><button type="button" onClick={toggle} aria-label={paused?"Продолжить записи":"Приостановить записи"}>{paused?<Play size={17}/>:<Pause size={17}/>}</button></div>
  </div>;
}
