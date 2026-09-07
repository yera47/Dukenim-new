"use client";

import { useState } from "react";
import type { BusinessVertical } from "@/types/database";
import { nichePresets } from "@/lib/niche-presets";

export function NichePreview({ vertical, templateName, background, surface, ink, muted, accent, storeName }: {
  vertical: BusinessVertical; templateName: string; background: string; surface: string;
  ink: string; muted: string; accent: string; storeName?: string;
}) {
  const preset = nichePresets[vertical];
  const [section, setSection] = useState(preset.sections[0]);
  return <div className="niche-preview" data-layout={templateName==="market"||templateName==="gallery"?"catalog":"editorial"} style={{ background, color: ink }}>
    <header><b>{storeName||preset.storeName}</b><span>Каталог · Корзина</span></header>
    <nav aria-label="Пример разделов">{preset.sections.map((item) => <button type="button" key={item} onClick={() => setSection(item)} aria-pressed={section === item}>{item}</button>)}</nav>
    <div className="niche-preview-content">
      <div><small>{section}</small><h3>{preset.headline}</h3><p style={{ color: muted }}>{preset.guidance}</p></div>
      <article style={{ background: surface }}>
        <div className="niche-preview-photo" style={preset.imageUrl ? { backgroundImage: `url("${preset.imageUrl}")` } : { background: `linear-gradient(145deg, ${surface}, ${accent}55)` }}><span>Демонстрационный товар</span></div>
        <b>{preset.product}</b><strong>{preset.price}</strong>
      </article>
    </div>
  </div>;
}
