"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import styles from "./promo-film.module.css";
import { DukenimLogo } from "@/components/dukenim-logo";

const VIDEO_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_3IiQlgoGNOZecy2pHManEfSn5Xj/hf_20260907_085311_5af3def7-9f51-4002-ac03-b39ffabb4b5e.mp4";

export function PromoFilm() {
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  async function toggle() {
    if (!video.current) return;
    if (video.current.paused) { try { await video.current.play(); setPaused(false); } catch { setPaused(true); } }
    else { video.current.pause(); setPaused(true); }
  }
  return <div id="promo-film" className={styles.frame}>
    <video ref={video} autoPlay muted loop playsInline preload="metadata" aria-label="Демонстрационный ролик Dukenim: владелец управляет магазином с телефона">
      <source src={VIDEO_URL} type="video/mp4"/>
    </video>
    <div className={styles.copy}><DukenimLogo inverse/><h3>Магазин всегда рядом.</h3><p>Создавайте каталог. Принимайте заказы. Управляйте с телефона.</p></div>
    <button type="button" onClick={toggle} aria-label={paused ? "Продолжить ролик" : "Приостановить ролик"}>{paused ? <Play size={16}/> : <Pause size={16}/>}</button>
  </div>;
}
