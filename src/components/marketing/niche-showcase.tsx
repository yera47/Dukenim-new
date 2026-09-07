"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { nichePresets } from "@/lib/niche-presets";
import type { BusinessVertical } from "@/types/database";
import styles from "./niche-showcase.module.css";

const order: BusinessVertical[] = ["fashion", "beauty", "food", "flowers", "home", "services"];

export function NicheShowcase() {
  const [vertical, setVertical] = useState<BusinessVertical>("fashion");
  const preset = nichePresets[vertical];
  return <div className={styles.shell}>
    <div className={styles.tabs}>{order.map((key) => <button type="button" key={key} aria-pressed={key === vertical} onClick={() => setVertical(key)}>{nichePresets[key].label}</button>)}</div>
    <div className={styles.store}>
      <header><b>{preset.storeName}</b><span>Поиск · Корзина</span></header>
      <nav>{preset.sections.map((section) => <span key={section}>{section}</span>)}</nav>
      <div className={styles.body}>
        <div><small>ПРИМЕР ВИТРИНЫ</small><h3>{preset.headline}</h3><p>{preset.guidance}</p><button type="button">Смотреть каталог <ArrowRight size={15}/></button></div>
        <article><div className={styles.photo} style={preset.imageUrl ? { backgroundImage: `url("${preset.imageUrl}")` } : undefined}/><b>{preset.product}</b><span>{preset.price}</span></article>
      </div>
    </div>
    <p className={styles.disclaimer}>Демонстрация структуры и изображения. Это не настоящий магазин и не обещание готовой отраслевой автоматизации.</p>
  </div>;
}
