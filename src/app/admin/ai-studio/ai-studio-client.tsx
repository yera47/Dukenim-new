"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, LoaderCircle, Send, Sparkles } from "lucide-react";
import { CatalogSetupForm } from "@/components/admin/catalog-setup-form";
import { ProductForm } from "@/components/admin/product-form";
import styles from "./studio.module.css";
import type { BusinessVertical } from "@/types/database";

type Intent = "hero" | "promotion" | "catalog_copy" | "catalog_structure" | "store_design" | "banner";
type Draft = { eyebrow?: string; title: string; body: string; ctaLabel: string };
type Banner = { imageUrl: string; generationId: string };
type Structure = { sections: Array<{ name: string; description: string }> };
type Design = { templateKey: string; paletteKey: string; heroTitle: string; heroSubtitle: string; heroCtaLabel: string; rationale: string };
const intents: Array<{ id: Intent; title: string; text: string }> = [
  { id: "catalog_structure", title: "Разделы каталога", text: "Что продаёте и как покупатели выбирают товар?" },
  { id: "store_design", title: "Оформление витрины", text: "Какое впечатление должна создавать витрина и что покупатель должен заметить первым?" },
  { id: "hero", title: "Описание магазина", text: "Расскажите, что отличает ваш магазин и кому он подходит." },
  { id: "catalog_copy", title: "Текст подборки", text: "Какие товары объединяем и что важно покупателю?" },
  { id: "promotion", title: "Объявление об акции", text: "Укажите реальные условия, сроки и товары акции." },
  { id: "banner", title: "Фон для баннера", text: "Опишите настроение и композицию. Фотографии реального товара добавляются отдельно." },
];
const templateNames: Record<string, string> = { atelier: "Обложка и коллекции", studio: "Чистая витрина", market: "Быстрый каталог", journal: "Истории и подборки", gallery: "Визуальная витрина", signature: "Фирменная витрина" };
const paletteNames: Record<string, string> = { mono: "Чёрный и белый", "ink-brass": "Графит и латунь", "paper-forest": "Бумага и лес", "clay-milk": "Глина и молоко", "ocean-sand": "Океан и песок", "plum-stone": "Слива и камень", "cobalt-cloud": "Кобальт и облако", "olive-linen": "Олива и лён", "cherry-cream": "Вишня и крем", "terra-charcoal": "Терракота и уголь", "mint-charcoal": "Мята и уголь", "rose-ink": "Роза и тушь", "sunset-navy": "Закат и тёмно-синий" };
type Props = {
  enabled: boolean; imageEnabled: boolean; brand: boolean;
  catalogStatus: "not_started" | "building" | "ready";
  storeName: string; slug: string; plan: "basic" | "standard" | "pro";
  vertical: BusinessVertical;
  initialStructure?: { generationId: string; structure: Structure };
  categories?: Array<{ id: string; name: string }>;
};
export function AiStudioClient({ enabled, imageEnabled, brand, catalogStatus, storeName, slug, plan, vertical, initialStructure, categories = [] }: Props) {
  const router = useRouter();
  const [intent, setIntent] = useState<Intent>("catalog_structure");
  const [brief, setBrief] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [pending, setPending] = useState(false);
  const [campaignPending, setCampaignPending] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [resultIntent, setResultIntent] = useState<Intent | null>(initialStructure ? "catalog_structure" : null);
  const [structure, setStructure] = useState<Structure | null>(initialStructure?.structure ?? null);
  const [design, setDesign] = useState<Design | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(initialStructure?.generationId ?? null);
  const [structureSaving, setStructureSaving] = useState(false);
  const [structureSaved, setStructureSaved] = useState(false);
  const [designSaving, setDesignSaving] = useState(false);
  const [designSaved, setDesignSaved] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftTarget, setDraftTarget] = useState<"storefront" | "campaign" | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const step = catalogStatus === "not_started" ? 0 : catalogStatus === "building" ? 1 : 2;
  const canRun = intent === "banner" ? imageEnabled : enabled;
  const selected = intents.find((item) => item.id === intent)!;
  const supportHref = `/admin/requests?source=ai-studio&intent=${intent}`;

  async function createDraft() {
    if (pending || !canRun || brief.trim().length < 8) return;
    setPending(true); setError(""); setCopied(false);
    setGenerationId(null); setStructureSaved(false); setDesignSaved(false); setDraftSaved(false); setDraftTarget(null); setResultIntent(null);
    setDraft(null); setStructure(null); setDesign(null); setBanner(null); setCampaignId(null);
    setSubmitted(brief.trim());
    try {
      const response = await fetch(intent === "banner" ? "/api/ai-studio/banner" : "/api/ai-studio/draft", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intent === "banner" ? { brief } : { intent, brief }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.needsTopup) setCreditsRemaining(0);
        throw new Error(data.error || "Не удалось получить ответ. Попробуйте ещё раз.");
      }
      setDraft(data.draft ?? null); setStructure(data.structure ?? null); setDesign(data.design ?? null);
      setGenerationId(data.generationId ?? null);
      setResultIntent(intent);
      setBanner(data.imageUrl && data.generationId ? { imageUrl: data.imageUrl, generationId: data.generationId } : null);
      if (typeof data.creditsRemaining === "number") setCreditsRemaining(data.creditsRemaining);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось получить ответ."); }
    finally { setPending(false); }
  }
  async function addBannerToCampaigns() {
    if (!banner) return;
    setCampaignPending(true); setError("");
    try {
      const response = await fetch("/api/ai-studio/banner/campaign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId: banner.generationId }),
      });
      const data = await response.json();
      if (!response.ok || !data.campaignId) throw new Error(data.error ?? "Не удалось сохранить кампанию.");
      setCampaignId(data.campaignId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось сохранить кампанию."); }
    finally { setCampaignPending(false); }
  }
  async function copyResult() {
    const text = structure ? structure.sections.map((s) => `${s.name}\n${s.description}`).join("\n\n") : design ? [templateNames[design.templateKey], paletteNames[design.paletteKey], design.heroTitle, design.heroSubtitle, design.heroCtaLabel, design.rationale].filter(Boolean).join("\n\n") : draft ? [draft.eyebrow, draft.title, draft.body, draft.ctaLabel].filter(Boolean).join("\n\n") : "";
    try { await navigator.clipboard.writeText(text); setCopied(true); }
    catch { setError("Браузер не разрешил копирование. Выделите текст результата вручную."); }
  }
  async function saveStructure() {
    if (!generationId || structureSaving) return;
    setStructureSaving(true); setError("");
    try {
      const response = await fetch("/api/ai-studio/structure/apply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId }),
      });
      const data = await response.json();
      if (!response.ok || !data.saved) throw new Error(data.error ?? "Не удалось сохранить разделы.");
      setStructureSaved(true); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось сохранить разделы."); }
    finally { setStructureSaving(false); }
  }
  async function saveDesign() {
    if (!generationId || designSaving) return;
    setDesignSaving(true); setError("");
    try {
      const response = await fetch("/api/ai-studio/design/apply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId }),
      });
      const data = await response.json();
      if (!response.ok || !data.saved) throw new Error(data.error ?? "Не удалось применить оформление.");
      setDesignSaved(true); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось применить оформление."); }
    finally { setDesignSaving(false); }
  }
  async function saveDraft() {
    if (!generationId || !draft || draftSaving || !resultIntent || !["hero", "promotion"].includes(resultIntent)) return;
    setDraftSaving(true); setError("");
    try {
      const response = await fetch("/api/ai-studio/copy/apply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId }),
      });
      const data = await response.json();
      if (!response.ok || !data.saved) throw new Error(data.error ?? "Не удалось сохранить текст.");
      setDraftSaved(true); setDraftTarget(data.target === "campaign" ? "campaign" : "storefront"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось сохранить текст."); }
    finally { setDraftSaving(false); }
  }

  if (catalogStatus === "not_started") return <div className={styles.workspace}>
    {!workspaceOpen ? <section className={styles.welcome}>
      <Sparkles size={32}/><h2>Давайте создадим ваш магазин.</h2>
      <p>Я помогу выбрать оформление, подготовить разделы и добавить первый товар. Пройдём каждый шаг вместе.</p>
      <button type="button" className="btn btn-primary" onClick={()=>setWorkspaceOpen(true)}>Создать каталог с AI Studio <ArrowRight size={17}/></button>
      <Link href={supportHref}>Написать человеку</Link>
    </section> : <section>
      <button type="button" onClick={()=>setWorkspaceOpen(false)} className="text-sm text-neutral-500">← В начало Studio</button>
      <CatalogSetupForm defaultName={storeName} slug={slug} plan={plan} vertical={vertical} fromStudio aiEnabled={enabled}/>

    </section>}
  </div>;

  return <div className={styles.workspace}>
    <ol className={styles.steps} aria-label="Этапы запуска магазина">
      {["Создать основу", "Добавить товары", "Проверить витрину"].map((label, index) =>
        <li key={label} aria-current={index === step ? "step" : undefined}>
          <span>{index < step ? <Check size={15}/> : index + 1}</span>{label}
        </li>)}
    </ol>
    <div className={styles.columns}>
      <section className={styles.chat} aria-label="Помощник AI Studio">
        <div className={styles.assistant}>
          <Sparkles size={22} aria-hidden="true"/>
          <div><h2>{step === 0 ? "Начнём с вашего магазина." : step === 1 ? "Основа есть. Теперь — первый товар." : "Что улучшим в магазине?"}</h2>
            <p>{step === 0 ? "Расскажите, что продаёте. AI предложит разделы и текст, а рядом вы сможете создать настоящую витрину. Сначала предложение — затем ваше решение." : step === 1 ? "Добавьте свои фотографии, цену и остаток. AI доступен уже сейчас: поможет сформулировать описание и организовать ассортимент." : "Подготовим текст, подборку или фон для акции. Товары, заказы и настройки всегда доступны в меню."}</p>
          </div>
        </div>
        <div className={styles.choices} aria-label="Задача для помощника">
          {intents.map((item) => <button key={item.id} type="button" aria-pressed={intent === item.id} disabled={pending} onClick={() => setIntent(item.id)}>{item.title}</button>)}
        </div>
        {submitted && <div className={styles.userMessage}><small>Ваш запрос</small><p>{submitted}</p></div>}
        <div aria-live="polite" role="status">
          {pending && <p className={styles.waiting}><LoaderCircle size={18} className="animate-spin"/> Готовлю предложение для вашего магазина…</p>}
          {!pending && (draft || structure || design || banner) && <p className={styles.answer}>Предложение готово в блоке результата. Проверьте его перед использованием. Ничего не опубликовано автоматически.</p>}
        </div>
        <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); void createDraft(); }}>
          <label htmlFor="studio-message">{selected.text}</label>
          <textarea id="studio-message" value={brief} onChange={(event) => setBrief(event.target.value)} maxLength={800} minLength={8} required rows={4} placeholder="Например: магазин базовой женской одежды. Нужны понятные разделы: верх, низ, обувь. Тон — простой, без громких обещаний."/>
          <div><span/><button type="submit" disabled={!canRun || brief.trim().length < 8 || pending} aria-label="Отправить запрос"><Send size={18}/></button></div>
        </form>
        {!canRun && <p className={styles.notice}>{intent === "banner" && !brand ? "Фоны для баннеров входят в «Бренд». Разделы и тексты доступны на обоих тарифах." : "Генерация сейчас недоступна. Создание каталога вручную и поддержка остаются доступны."}</p>}
        {creditsRemaining !== null && creditsRemaining <= 12 && <div className={styles.notice}>Лимит AI почти использован. <Link href="/admin/settings/usage">Посмотреть использование</Link></div>}
        {error && <p role="alert" className={styles.error}>{error} <Link href={supportHref}>Написать в поддержку</Link></p>}
        <p className={styles.footnote}>AI помогает с оформлением, разделами, текстами и фонами. Изменения применяются только по вашей кнопке; цены, остатки и DNS он не меняет. <Link href="/admin/domains">Ссылка и свой домен →</Link></p>
      </section>
      <aside className={styles.preview} aria-label="Результат и создание магазина">
        <div className={styles.previewHeading}><span>Ваш магазин</span><small>{step === 0 ? "Основа ещё не сохранена" : step === 1 ? "Ожидает первый товар" : "Каталог создан"}</small></div>
        <h2>{storeName}</h2>
        <p className={styles.address}>dukenim.kz/s/{slug}</p>
        <div className={styles.nextStep}>
          <b>{step === 0 ? "Создайте основу каталога" : step === 1 ? "Добавьте первый товар" : "Посмотрите глазами покупателя"}</b>
          <p>{step === 0 ? "Название и оформление сохранятся в вашем магазине. Товары добавляются следующим шагом." : step === 1 ? "Используйте фотографии реального товара. Проверьте цену, варианты и доступность перед сохранением." : "Проверьте товары, контакты и способы получения заказа, прежде чем делиться ссылкой."}</p>
          {step < 2 ? <button type="button" className="btn btn-primary" aria-expanded={workspaceOpen} aria-controls="studio-setup" onClick={() => setWorkspaceOpen(!workspaceOpen)}>{workspaceOpen ? "Свернуть редактор" : step === 0 ? "Создать каталог здесь" : "Добавить товар здесь"} <ArrowRight size={16}/></button> : <Link className="btn btn-primary" href={`/s/${slug}`} target="_blank" rel="noopener noreferrer">Открыть витрину <ArrowRight size={16}/></Link>}
        </div>
        <div className={styles.result}>
          <small>ПРЕДЛОЖЕНИЕ AI · НЕ ОПУБЛИКОВАНО</small>
          {banner ? <><Image unoptimized width={1600} height={900} src={banner.imageUrl} alt="Предложенный фон для баннера"/><button className="btn btn-secondary" type="button" disabled={campaignPending || Boolean(campaignId)} onClick={addBannerToCampaigns}>{campaignPending ? "Сохраняем…" : campaignId ? "Сохранено в кампании" : "Сохранить в кампании"}</button>{campaignId && <Link href="/admin/settings#campaigns">Проверить и опубликовать кампанию →</Link>}</> :
          structure ? <>{structure.sections.map((section, index) => <div key={index} className={styles.category}><h3>{section.name}</h3><p>{section.description}</p></div>)}<p>{structureSaved ? "Разделы сохранены. Теперь при добавлении товара выберите нужный раздел." : step === 0 ? "Сохраните основу каталога ниже. Это предложение останется доступным после сохранения." : "Добавим названия разделов в ваш каталог. Существующие товары и разделы не изменятся."}</p><button type="button" className="btn btn-primary" disabled={step === 0 || !generationId || structureSaving || structureSaved || pending} onClick={saveStructure}>{structureSaving ? "Сохраняем…" : structureSaved ? "Разделы сохранены" : "Добавить разделы в каталог"}</button></> :
          design ? <><div className={styles.designMeta}><span>{templateNames[design.templateKey] ?? design.templateKey}</span><span>{paletteNames[design.paletteKey] ?? design.paletteKey}</span></div><div className={styles.designHero}><small>ГЛАВНЫЙ ЭКРАН</small><h3>{design.heroTitle}</h3><p>{design.heroSubtitle}</p><b>{design.heroCtaLabel}</b></div><p>{design.rationale}</p><p>{designSaved ? "Оформление применено. Откройте витрину и проверьте результат глазами покупателя." : "AI подготовил вариант, но ещё ничего не изменил. Текущая фотография и фирменный цвет сохранятся."}</p><button type="button" className="btn btn-primary" disabled={!generationId || designSaving || designSaved || pending} onClick={saveDesign}>{designSaving ? "Применяем…" : designSaved ? "Оформление применено" : "Применить оформление"}</button>{designSaved && <Link href={`/s/${slug}`} target="_blank" rel="noopener noreferrer">Открыть обновлённую витрину →</Link>}</> :
          draft ? <><span>{draft.eyebrow}</span><h3>{draft.title}</h3><p>{draft.body}</p><b>{draft.ctaLabel}</b><p>{draftSaved ? draftTarget === "campaign" ? "Черновик кампании сохранён. Проверьте текст и условия перед публикацией." : "Текст применён к главному экрану витрины." : resultIntent === "promotion" && !brand ? "Скопируйте текст или перейдите на «Бренд», чтобы сохранить его кампанией." : resultIntent === "hero" ? "AI подготовил текст, но ещё не изменил витрину." : "Текст готов для копирования и ручного использования."}</p>{(resultIntent === "hero" || (resultIntent === "promotion" && brand)) && <button type="button" className="btn btn-primary" disabled={!generationId || draftSaving || draftSaved || pending} onClick={saveDraft}>{draftSaving ? "Сохраняем…" : draftSaved ? draftTarget === "campaign" ? "Кампания сохранена" : "Текст применён" : resultIntent === "promotion" ? "Сохранить кампанию черновиком" : "Применить к главному экрану"}</button>}{draftSaved && <Link href={draftTarget === "campaign" ? "/admin/settings#campaigns" : `/s/${slug}`} target={draftTarget === "storefront" ? "_blank" : undefined} rel={draftTarget === "storefront" ? "noopener noreferrer" : undefined}>{draftTarget === "campaign" ? "Открыть кампании →" : "Открыть обновлённую витрину →"}</Link>}</> :
          <p>Напишите помощнику слева — здесь появятся оформление, разделы, текст или фон. На телефоне результат находится сразу под чатом.</p>}
          {(draft || structure || design) && <button className="btn btn-secondary" type="button" onClick={copyResult}>{copied ? "Скопировано" : "Скопировать текст"}</button>}
        </div>
        <Link className={styles.support} href={supportHref}>Не получается? Передать вопрос команде Dukenim →</Link>
      </aside>
    </div>
    {workspaceOpen && step < 2 && <section id="studio-setup" className={styles.editor}>
      <div className={styles.previewHeading}><h2>{step === 0 ? "Создание каталога" : "Первый товар"}</h2><button type="button" onClick={() => setWorkspaceOpen(false)}>Свернуть</button></div>
      <p>Сохранение выполняется только по вашей кнопке. Редактор не заменяет фотографии и данные товара выдуманными.</p>
      {step === 0 ? <CatalogSetupForm defaultName={storeName} slug={slug} plan={plan} vertical={vertical} fromStudio aiEnabled={enabled}/> : <ProductForm fromStudio categories={categories} vertical={vertical}/>}
    </section>}
  </div>;
}
