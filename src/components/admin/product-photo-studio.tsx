"use client";
/* eslint-disable @next/next/no-img-element -- previews use local blob URLs selected by the merchant. */

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, ImagePlus, Layers3, LoaderCircle, RotateCcw, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { productPhotoModeCopy, productPhotoScenarioCopy, validateProductPhotoDraft, type ProductPhotoMode, type ProductPhotoScenario, type ProductPhotoStage } from "@/lib/ai/product-photo-workflow";
import { AI_OUTPUT_COUNT_DEFAULT, quoteProductCredits } from "@/lib/ai/product-credit-ledger";
import styles from "./product-photo-studio.module.css";
import "./product-photo-studio.mobile.css";

type DemoResult = { id: string; url: string; label: string };
type Props = { providerAvailable: boolean; monthlyLimit: number | null; usedPacks?: number; creditBalance?: number | null; creditCostPerOutput?: number | null; creditPricingReady?: boolean; demoSource?: string; demoResults?: DemoResult[] };
const fileStamp = (file: File) => ({ name: file.name, size: file.size, type: file.type, lastModified: file.lastModified });

export function ProductPhotoStudio({ providerAvailable, creditBalance = null, creditCostPerOutput = null, creditPricingReady = false, demoSource, demoResults = [] }: Props) {
  const [scenario, setScenario] = useState<ProductPhotoScenario>("product_photos");
  const [mode, setMode] = useState<ProductPhotoMode>("background_composite");
  const [count, setCount] = useState<2 | 3 | 4 | 5>(AI_OUTPUT_COUNT_DEFAULT);
  const [instruction, setInstruction] = useState("Светлый фон, мягкая боковая тень, сохранить форму товара");
  const [source, setSource] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(demoSource ?? null);
  const [references, setReferences] = useState<File[]>([]);
  const [merchantFacts, setMerchantFacts] = useState("");
  const [stage, setStage] = useState<ProductPhotoStage>(demoResults.length ? "review" : "idle");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(demoResults[0]?.id ?? "");
  const [accepted, setAccepted] = useState<string[]>([]);
  const [merchantApproved, setMerchantApproved] = useState(false);
  const requestKeys = useRef(new Map<string, string>());
  const requestInFlight = useRef(false);
  const validation = useMemo(() => validateProductPhotoDraft({ scenario, mode, outputCount: count, instruction, sourceCount: sourceUrl ? 1 : 0, additionalReferenceCount: references.length, merchantFacts }), [scenario, mode, count, instruction, sourceUrl, references.length, merchantFacts]);
  const modeCopy = productPhotoModeCopy(mode);
  const current = demoResults.find(item => item.id === selected) ?? demoResults[0];

  useEffect(() => {
    if (!source) return;
    const url = URL.createObjectURL(source);
    setSourceUrl(url);
    setStage("ready");
    return () => URL.revokeObjectURL(url);
  }, [source]);

  async function requestPack() {
    if (!validation.ok || !source || !merchantApproved || requestInFlight.current) return;
    requestInFlight.current = true;
    const signature = JSON.stringify({ scenario, mode, count, instruction, merchantFacts, source: fileStamp(source), references: references.map(fileStamp) });
    const idempotencyKey = requestKeys.current.get(signature) ?? crypto.randomUUID();
    requestKeys.current.set(signature, idempotencyKey);
    setError("");
    setStage("queued");
    const body = new FormData();
    body.set("source", source);
    body.set("scenario", scenario);
    body.set("mode", mode);
    body.set("outputCount", String(count));
    body.set("instruction", instruction);
    body.set("merchantFacts", merchantFacts);
    body.set("idempotencyKey", idempotencyKey);
    body.set("merchantApproved", "true");
    references.forEach(file => body.append("references", file));
    try {
      setStage("processing");
      const response = await fetch("/api/ai-studio/product-photos", { method: "POST", body });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Пакет не создан.");
      throw new Error("Провайдер вернул неподдерживаемый ответ.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Пакет не создан.");
      setStage("error");
    } finally {
      requestInFlight.current = false;
    }
  }

  function reset() {
    setSource(null);
    setSourceUrl(demoSource ?? null);
    setReferences([]);
    setAccepted([]);
    setMerchantApproved(false);
    requestKeys.current.clear();
    setError("");
    setStage(demoResults.length ? "review" : "idle");
  }

  const busy = stage === "queued" || stage === "processing";
  const creditQuote = quoteProductCredits({
    outputCount: count,
    balance: creditBalance ?? 0,
    costPerOutput: creditPricingReady ? creditCostPerOutput : null,
    model: creditPricingReady ? "server-price-rule" : null,
    resolution: creditPricingReady ? "server-selected" : null,
    referenceMegapixels: creditPricingReady ? 0 : null,
    killSwitch: false,
  });
  const canSpendCredits = creditBalance !== null && creditQuote.enabled;
  const creditLabel = creditBalance === null ? "Баланс кредитов загрузится после подключения server ledger" : `Баланс: ${creditBalance} кредитов`;
  const spendLabel = creditQuote.totalCredits === null ? "Расчёт списания недоступен: тариф провайдера ещё не подтверждён." : `Будет зарезервировано: ${creditQuote.totalCredits}; после успеха останется ${creditQuote.remainingCredits}.`;

  return <section className={styles.shell} aria-labelledby="product-photo-title" data-review={demoResults.length > 0 ? "true" : undefined}>
    <header className={styles.header}><div><span className={styles.kicker}><Sparkles size={15}/> AI-фотостудия</span><h2 id="product-photo-title">Один товар. От 2 до 5 вариантов.</h2><p>Подготовьте оригинал и сценарий. Генерация станет доступна после подключения Azure, лимита расходов и учёта кредитов. Ничего не публикуется автоматически.</p></div><div className={styles.quota}><b>{creditLabel}</b><span>Стоимость Azure возникает при запросе генерации. До запуска мы покажем цену в кредитах и запросим подтверждение.</span></div></header>
    <div className={styles.layout}>
      <div className={styles.controls}>
        <div className={styles.modeGrid}>{(["product_photos", "catalog_hero", "story_promo"] as ProductPhotoScenario[]).map(value => { const copy = productPhotoScenarioCopy(value); return <button key={value} type="button" aria-pressed={scenario === value} onClick={() => setScenario(value)}><span><Sparkles/></span><b>{copy.title}</b><small>{copy.description}</small></button>; })}</div>
        <div className={styles.modeGrid}>{(["background_composite", "creative_angles"] as ProductPhotoMode[]).map(value => { const copy = productPhotoModeCopy(value); return <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}><span>{value === "background_composite" ? <Layers3/> : <Sparkles/>}</span><b>{copy.title}</b><small>{copy.description}</small></button>; })}</div>
        <label className={styles.upload}><Upload/><span><b>{sourceUrl ? "Оригинал выбран" : "Загрузить фото товара"}</b><small>JPG, PNG или WebP до 10 МБ. Оригинал хранится отдельным слоем.</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setSource(event.target.files?.[0] ?? null)}/></label>
        {mode === "creative_angles" && <label className={styles.upload}><ImagePlus/><span><b>Дополнительные оригиналы</b><small>Минимум два: вид сбоку, сзади или важная деталь.</small></span><input multiple type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setReferences(Array.from(event.target.files ?? []).slice(0, 6))}/><em>{references.length} выбрано</em></label>}
        <label className={styles.field}><span>Что изменить вокруг товара</span><textarea value={instruction} maxLength={500} onChange={event => setInstruction(event.target.value)}/><small>{instruction.length}/500 · нельзя менять форму, маркировку, цвет, фактуру или вид товара</small></label>
        {scenario !== "product_photos" && <label className={styles.field}><span>Факты магазина для отдельного текстового слоя</span><textarea value={merchantFacts} maxLength={800} onChange={event => setMerchantFacts(event.target.value)} placeholder="Например, подтверждённая акция, состав, наличие, сроки"/><small>Цены, акции, состав и наличие берутся только отсюда. Черновой текст не встраивается в изображение и проверяется в storefront preview.</small></label>}
        <fieldset className={styles.count}><legend>Количество результатов</legend>{([2, 3, 4, 5] as const).map(value => <button type="button" key={value} aria-pressed={count === value} onClick={() => setCount(value)}>{value} шт.</button>)}</fieldset>
        <div className={styles.safety} role="status"><ShieldCheck/><p><b>{creditLabel}</b><span>{spendLabel}</span><span>Кредиты — внутренние единицы продукта, не токены модели и не валюта. Правило списания появится после проверки затрат Azure и серверного учёта.</span></p></div>
        <div className={styles.safety}><ShieldCheck/><p><b>{modeCopy.provenance}</b><span>{mode === "background_composite" ? "Товар и контактная тень сохраняются без генерации товара. Любая ошибка детали отклоняет результат независимо от similarity score." : "Невидимые детали не угадываются. Для каждого ракурса проверяются углы, маркировка, форма, швы, логотип, цвет и текст."}</span></p></div>
        <label className={styles.safety}><input type="checkbox" checked={merchantApproved} onChange={event => setMerchantApproved(event.target.checked)}/><p><b>Подтверждаю один запрос</b><span>Разрешение относится только к текущим файлам и параметрам. Повтор после сетевой ошибки использует тот же idempotency key.</span></p></label>
        {validation.errors.length > 0 && <div className={styles.errors} role="status">{validation.errors.map(item => <p key={item}><AlertCircle size={15}/>{item}</p>)}</div>}
        {error && <div className={styles.errors} role="alert"><p><AlertCircle size={15}/>{error}</p><button type="button" onClick={() => void requestPack()}><RotateCcw size={15}/>Повторить с тем же ключом</button></div>}
        <button type="button" className={styles.generate} disabled={!providerAvailable || !canSpendCredits || !validation.ok || !merchantApproved || busy} onClick={() => void requestPack()}>{busy ? <><LoaderCircle className={styles.spin}/>Запрос в очереди</> : providerAvailable ? `Создать ${count} вариантов` : "Live-генерация недоступна"}</button>
        {!providerAvailable && <p className={styles.unavailable}>Провайдер и бюджет не подключены. Настройки можно подготовить, но файлы никуда не отправляются.</p>}
        <p className={styles.unavailable}>Пополнение выключено до проверенного серверного webhook. В iOS цифровые кредиты потребуют отдельного StoreKit IAP-потока.</p>
      </div>
      <div className={styles.review}>
        <div className={styles.stage}><span data-active={stage === "queued" || stage === "processing"}>1 · Очередь</span><span data-active={stage === "review"}>2 · Проверка</span><span data-active={stage === "approved"}>3 · Черновик</span></div>
        <div className={styles.compare}>
          <figure><figcaption>Оригинал · источник истины</figcaption>{sourceUrl ? <img src={sourceUrl} alt="Исходное фото товара"/> : <div className={styles.empty}><ImagePlus/><b>Здесь появится оригинал</b><span>Мы не заменяем его незаметно.</span></div>}</figure>
          <figure><figcaption>{current ? current.label : "Результат для ручной проверки"}</figcaption>{current ? <img src={current.url} alt="Синтетический демонстрационный результат"/> : <div className={styles.empty}>{busy ? <LoaderCircle className={styles.spin}/> : <Sparkles/>}<b>{busy ? "Запрос обрабатывается" : "Результатов пока нет"}</b><span>{busy ? "Дождитесь ответа на этой странице." : "После подключения провайдера каждый файл потребуется проверить."}</span></div>}</figure>
        </div>
        {demoResults.length > 0 && <><div className={styles.thumbs}>{demoResults.map(item => <button key={item.id} type="button" aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}><img src={item.url} alt=""/><span>{accepted.includes(item.id) ? <Check size={14}/> : null}{item.label}</span></button>)}</div><div className={styles.reviewActions}><button type="button" disabled={!current || accepted.includes(current.id)} onClick={() => { if (!current) return; setAccepted(items => [...items, current.id]); setStage("approved"); }}><Check/>Принять вариант</button><button type="button" disabled title="Публикация доступна только после сохранения принятого файла в черновик магазина">Опубликовать</button></div><p className={styles.synthetic}>Демо-результаты синтетические. Принятие на этом экране не публикует товар.</p></>}
        {(sourceUrl || demoResults.length > 0) && <button type="button" className={styles.reset} onClick={reset}><RotateCcw size={15}/>Начать заново</button>}
      </div>
    </div>
  </section>;
}
