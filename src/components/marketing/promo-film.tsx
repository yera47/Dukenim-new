"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import styles from "./promo-film.module.css";

const VIDEO_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_3IiQlgoGNOZecy2pHManEfSn5Xj/hf_20260907_073008_a61b4e08-e261-419b-bd66-c7dc329261b2.mp4";

export function PromoFilm() {
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  async function toggle() {
    if (!video.current) return;
    if (video.current.paused) { await video.current.play(); setPaused(false); }
    else { video.current.pause(); setPaused(true); }
  }
  return <div id="promo-film" className={styles.frame}>
    <video ref={video} autoPlay muted loop playsInline preload="metadata" aria-label="Демонстрационный ролик Dukenim: владелец управляет магазином с телефона">
      <source src={VIDEO_URL} type="video/mp4"/>
    </video>
    <div className={styles.copy}><small>DUKENIM В РАБОТЕ</small><h3>Магазин всегда рядом.</h3><p>Ролик передаёт идею. Следом показан настоящий интерфейс: каталог, заказ и кабинет.</p></div>
    <button type="button" onClick={toggle} aria-label={paused ? "Продолжить ролик" : "Приостановить ролик"}>{paused ? <Play size={16}/> : <Pause size={16}/>}</button>
  </div>;
}
