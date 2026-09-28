"use client";

import Image from "next/image";
import { useRef } from "react";
import styles from "@/app/home.module.css";

export function LivingSystemVisual() {
  const root = useRef<HTMLDivElement>(null);

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    root.current?.style.setProperty("--visual-x", `${x * 14}px`);
    root.current?.style.setProperty("--visual-y", `${y * 10}px`);
  }

  function reset() {
    root.current?.style.setProperty("--visual-x", "0px");
    root.current?.style.setProperty("--visual-y", "0px");
  }

  return <div ref={root} className={styles.livingVisual} onPointerMove={move} onPointerLeave={reset} aria-label="Каталог, заказ, AI Studio и доставка Dukenim работают как одна система">
    <div className={styles.visualGlow} aria-hidden="true" />
    <div className={styles.visualOrbit} aria-hidden="true" />
    <Image className={styles.visualObject} src="/design/dukenim-system-stack-v1.png" alt="Слои системы Dukenim: витрина, заказ, AI Studio и маршрут" fill priority sizes="(max-width: 760px) 92vw, 48vw" />
    <div className={`${styles.visualChip} ${styles.visualChipCatalog}`} aria-hidden="true"><span>▦</span><b>Каталог</b><small>готов к заказам</small></div>
    <div className={`${styles.visualChip} ${styles.visualChipAi}`} aria-hidden="true"><span>✦</span><b>AI Studio</b><small>следующий шаг</small></div>
    <div className={`${styles.visualChip} ${styles.visualChipRoute}`} aria-hidden="true"><span>⌁</span><b>Маршрут</b><small>точки и задачи</small></div>
  </div>;
}
