"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { nichePresets } from "@/lib/niche-presets";
import { approvedConceptDemoNames } from "@/lib/demo-catalogs";
import type { BusinessVertical } from "@/types/database";
import styles from "./niche-showcase.module.css";

const order = ["fashion", "beauty", "flowers", "home", "other", "food"] as const satisfies readonly BusinessVertical[];

export function NicheShowcase() {
  const [vertical, setVertical] = useState<(typeof order)[number]>("fashion");
  const preset = nichePresets[vertical];
  const storeName = vertical === "food" ? "BULKA" : approvedConceptDemoNames[vertical] ?? preset.storeName;
  const directHref = `/demo/${vertical}/collection`;
  return <div className={styles.shell}>
    <div className={styles.tabs}>{order.map((key) => <button type="button" key={key} aria-pressed={key === vertical} onClick={() => setVertical(key)}>{nichePresets[key].label}</button>)}</div>
    <div className={styles.store}>
      <header><b>{storeName}</b><span>Поиск · Корзина</span></header>
      <nav>{preset.sections.map((section) => <span key={section}>{section}</span>)}</nav>
      <div className={styles.body}>
        <div><small>УТВЕРЖДЁННЫЙ ПРИМЕР</small><h3>{preset.headline}</h3><p>{preset.guidance}</p><Link href={directHref}>Открыть магазин <ArrowRight size={15}/></Link></div>
        <article><div className={styles.photo} style={preset.imageUrl ? { backgroundImage: `url("${preset.imageUrl}")` } : undefined}/><b>{preset.product}</b><span>{preset.price}</span></article>
      </div>
    </div>
    <p className={styles.disclaimer}>Синтетические товары и данные. Карточка открывает сам storefront без дополнительного выбора шаблона.</p>
  </div>;
}
