"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, ImagePlus, Palette, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { brandKitDraftInvalidation, prepareBrandKitPlan, type BrandKitProfile, type BrandKitStyle } from "@/lib/ai/brand-kit";
import type { BusinessVertical } from "@/types/database";

type Props = {
  tenantId: string;
  vertical: BusinessVertical;
  categories: Array<{ id: string; name: string }>;
  storeName: string;
  slug: string;
  logoReferenceId?: string | null;
  packagingReferenceIds?: string[];
  productReferenceIds?: string[];
  profileRevision?: number;
  providerAvailable?: boolean;
  remainingOutputs?: number;
};

const styles: Array<{ id: BrandKitStyle; label: string; copy: string }> = [
  { id: "clay-3d", label: "Объёмная пластика", copy: "Мягкие 3D-иллюстрации для еды, дома и предметов." },
  { id: "editorial-photo", label: "Редакционная съёмка", copy: "Спокойные фотографии и крупная типографика." },
  { id: "soft-collage", label: "Мягкий коллаж", copy: "Предметы, фактуры и цветовые плоскости." },
];

export function BrandKitStudio({
  tenantId,
  vertical,
  categories,
  storeName,
  slug,
  logoReferenceId = null,
  packagingReferenceIds = [],
  productReferenceIds = [],
  profileRevision = 1,
  providerAvailable = false,
  remainingOutputs = 0,
}: Props) {
  const [palette, setPalette] = useState({ background: "#fff8ef", surface: "#ffffff", accent: "#f59b14", ink: "#2b1a10" });
  const [selectedStyle, setSelectedStyle] = useState<BrandKitStyle>(vertical === "food" ? "clay-3d" : "editorial-photo");
  const [preparedProfile, setPreparedProfile] = useState<BrandKitProfile | null>(null);
  const profile = useMemo<BrandKitProfile>(() => ({
    tenantId,
    revision: profileRevision,
    palette,
    logoReferenceId,
    vertical,
    categories: categories.slice(0, 12),
    packagingReferenceIds,
    productReferenceIds,
    selectedStyle,
    layoutRatios: { hero: "16:9", category: "1:1", story: "9:16" },
  }), [tenantId, profileRevision, palette, logoReferenceId, vertical, categories, packagingReferenceIds, productReferenceIds, selectedStyle]);
  const plan = useMemo(() => prepareBrandKitPlan(profile, { remainingOutputs, budgetCapMicros: 0, estimatedMicrosPerOutput: null }), [profile, remainingOutputs]);
  const invalidation = preparedProfile ? brandKitDraftInvalidation(preparedProfile, profile) : { stale: false, reason: null };

  return <section className="mb-8 overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_24px_70px_rgba(28,18,22,.07)]" aria-labelledby="brand-kit-title" data-store-slug={slug}>
    <header className="grid gap-5 border-b bg-[linear-gradient(120deg,#fffaf3,#f6e9f0)] p-5 md:grid-cols-[1fr_auto] md:p-8">
      <div>
        <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-[#7b385f]"><Palette size={15}/> Brand Kit магазина</span>
        <h2 id="brand-kit-title" className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-.04em] md:text-5xl">Оформление, собранное вокруг {storeName}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">Единая система для главного экрана, категорий и Stories. Ничего не публикуется автоматически.</p>
      </div>
      <div className="self-start rounded-2xl border bg-white/80 p-4 text-sm"><b className="block">Провайдер выключен</b><span className="mt-1 block max-w-56 text-neutral-500">План можно проверить локально. Файлы не отправляются и бюджет не списывается.</span></div>
    </header>
    <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,.9fr)_minmax(20rem,1.1fr)] md:p-8">
      <div className="grid content-start gap-6">
        <div>
          <h3 className="font-bold">1. Цвета бренда</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{Object.entries(palette).map(([key, value]) => <label key={key} className="grid gap-2 text-xs font-bold"><span>{({ background: "Фон", surface: "Карточки", accent: "Акцент", ink: "Текст" } as Record<string, string>)[key]}</span><span className="flex items-center gap-2 rounded-xl border p-2"><input type="color" value={value} onChange={event => setPalette(previous => ({ ...previous, [key]: event.target.value }))}/><code>{value}</code></span></label>)}</div>
        </div>
        <div>
          <h3 className="font-bold">2. Проверенные оригиналы</h3>
          <div className="mt-3 grid gap-2 text-sm">
            <p className="flex items-center gap-2 rounded-xl border p-3"><Check size={17}/>{logoReferenceId ? "Логотип получен из сохранённого профиля магазина" : "Логотип не найден — знак придуман не будет"}</p>
            <p className="flex items-center gap-3 rounded-xl border p-3"><ImagePlus size={18}/><span><b className="block">Упаковка: {packagingReferenceIds.length}</b><small className="text-neutral-500">{packagingReferenceIds.length ? "Только подтверждённые сервером оригиналы." : "Оригиналы не приложены; результат будет помечен как декоративный."}</small></span></p>
            <p className="flex items-center gap-3 rounded-xl border p-3"><ImagePlus size={18}/><span><b className="block">Товары: {productReferenceIds.length}</b><small className="text-neutral-500">{productReferenceIds.length ? "Только подтверждённые сервером оригиналы." : "Клиентский переключатель не может выдать выдуманный файл за оригинал."}</small></span></p>
          </div>
        </div>
        <div>
          <h3 className="font-bold">3. Общий стиль</h3>
          <div className="mt-3 grid gap-2">{styles.map(item => <button type="button" key={item.id} aria-pressed={selectedStyle === item.id} onClick={() => setSelectedStyle(item.id)} className={`rounded-xl border p-3 text-left ${selectedStyle === item.id ? "border-[#7b385f] bg-[#fbf0f6]" : ""}`}><b>{item.label}</b><small className="mt-1 block text-neutral-500">{item.copy}</small></button>)}</div>
        </div>
        <button type="button" onClick={() => setPreparedProfile(profile)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#41233a] px-5 font-bold text-white"><Sparkles size={18}/>Подготовить план</button>
      </div>
      <aside className="rounded-2xl bg-[#f8f4f6] p-5">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.12em] text-[#7b385f]">До запуска</p><h3 className="mt-2 text-2xl font-semibold">{plan.estimatedOutputs} элементов в одном стиле</h3></div><ShieldCheck className="text-[#7b385f]"/></div>
        <p className="mt-3 text-sm text-neutral-600">Главный экран, {categories.length} категорий и 3 Stories. Форматы: 16:9, 1:1 и 9:16.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><p className="rounded-xl bg-white p-3"><b className="block">Лимит</b>{remainingOutputs} результатов доступно</p><p className="rounded-xl bg-white p-3"><b className="block">Стоимость</b>Не рассчитана без провайдера</p></div>
        {plan.warnings.map(item => <p key={item} className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{item}</p>)}
        {invalidation.stale && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">{invalidation.reason}</p>}
        <div className="mt-5 grid gap-2">{plan.targets.map(target => <div key={target.id} className="flex items-center gap-3 rounded-xl border bg-white p-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#f3e5ec] text-xs font-black">{target.ratio}</span><span className="min-w-0 flex-1"><b className="block truncate">{target.label}</b><small className="text-neutral-500">{target.decorative ? "Декоративное изображение" : "По проверенным оригиналам"}</small></span><button type="button" disabled title="Повтор будет доступен только после генерации" className="grid size-9 place-items-center rounded-full border opacity-45"><RefreshCw size={15}/></button></div>)}</div>
        {preparedProfile && <div className="mt-5 grid gap-3"><p className="rounded-xl bg-white p-3 text-sm"><b className="block">План подготовлен</b>Файлы не созданы и деньги не списаны. Для запуска потребуется отдельное подтверждение стоимости.</p><button type="button" disabled={!providerAvailable || !plan.withinQuota || !plan.withinBudget || invalidation.stale} className="min-h-12 rounded-full bg-[#41233a] px-5 font-bold text-white disabled:opacity-40">Подтвердить смету и создать черновик</button><Link href={`/demo/${vertical}/collection`} className="min-h-12 rounded-full border bg-white px-5 py-3 text-center font-bold">Предпросмотр магазина</Link><button type="button" disabled className="min-h-12 rounded-full border px-5 font-bold opacity-45">Применить принятый комплект</button></div>}
      </aside>
    </div>
  </section>;
}
