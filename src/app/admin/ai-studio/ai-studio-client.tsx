"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";

type Intent = "hero" | "promotion" | "catalog_copy" | "catalog_structure" | "banner";
type Draft = { eyebrow?: string; title: string; body: string; ctaLabel: string };
type Structure = { sections: { name: string; description: string }[] };
type BannerImage = { imageUrl?: string };
type Result = { kind: "draft"; value: Draft } | { kind: "structure"; value: Structure } | { kind: "banner"; value: BannerImage };

const intents: Array<{ id: Intent; title: string; text: string }> = [
  { id: "hero", title: "Главный блок", text: "Переосмыслить обещание и CTA витрины." },
  { id: "promotion", title: "Акция", text: "Собрать честный черновик кампании." },
  { id: "catalog_copy", title: "Подборка", text: "Описать категорию или сезонный выбор." },
  { id: "catalog_structure", title: "Структура каталога", text: "Предложить разделы под ваш бизнес." },
  { id: "banner", title: "Рекламный баннер", text: "Только фон и композиция — без конкретных вещей на фото." },
];

export function AiStudioClient({ enabled, creditsRemaining }: { enabled: boolean; creditsRemaining: number | null }) {
  const [intent, setIntent] = useState<Intent>("promotion");
  const [brief, setBrief] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [topUpAvailable, setTopUpAvailable] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function createDraft() {
    setPending(true); setError(""); setResult(null); setTopUpAvailable(false);
    try {
      const response = await fetch("/api/ai-studio/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent, brief }) });
      const data = await response.json();
      if (!response.ok) { setTopUpAvailable(Boolean(data.topUpAvailable)); throw new Error(data.error); }
      if (data.image) setResult({ kind: "banner", value: data.image });
      else if (data.structure) setResult({ kind: "structure", value: data.structure });
      else setResult({ kind: "draft", value: data.draft });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать результат.");
    } finally {
      setPending(false);
    }
  }

  const lowCredits = creditsRemaining !== null && creditsRemaining <= 5;

  return <div className="ai-studio-grid">
    <div className="ai-studio-form">
      {intents.map((item) => <button key={item.id} onClick={() => setIntent(item.id)} type="button" className={intent === item.id ? "is-selected" : ""}><b>{item.title}</b><span>{item.text}</span></button>)}
      <label>Что вы хотите сообщить покупателю?
        <textarea value={brief} onChange={(event) => setBrief(event.target.value)} maxLength={800} placeholder="Например: осенняя подборка свободных костюмов, без выдуманных скидок и сроков." />
      </label>
      <button onClick={createDraft} disabled={!enabled || brief.trim().length < 8 || pending} className="btn btn-primary">{pending ? "Создаём…" : <><Sparkles size={17} />Создать</>}</button>
      {!enabled && <p className="ai-studio-note">Интерфейс готов. Для запуска нужны серверные Azure-секреты и применённая миграция AI Studio.</p>}
      {lowCredits && !error && <p className="ai-studio-note">Осталось токенов: {creditsRemaining}. Пополнение — на странице «Тариф».</p>}
      {error && <p role="alert" className="ai-studio-error">{error}{topUpAvailable && <a href="/admin/plan" className="ml-2 font-bold underline">Пополнить →</a>}</p>}
    </div>
    <aside className="ai-studio-preview">
      <span className="data-label">ПРЕДПРОСМОТР — НЕ ОПУБЛИКОВАНО</span>
      {!result && <><h2>Ваш черновик появится здесь.</h2><p>Никаких автоматических публикаций и изменений кода — только предварительный результат для проверки владельцем.</p></>}
      {result?.kind === "draft" && <><small>{result.value.eyebrow}</small><h2>{result.value.title}</h2><p>{result.value.body}</p><button type="button">{result.value.ctaLabel}</button><em>Сначала проверьте текст, затем вручную перенесите его в настройки витрины или акцию.</em></>}
      {result?.kind === "structure" && <><h2>Разделы каталога</h2><ul className="mt-3 space-y-3 text-left">{result.value.sections.map((section) => <li key={section.name}><b>{section.name}</b><p className="text-sm opacity-80">{section.description}</p></li>)}</ul><em className="mt-4 block">Перенесите подходящие разделы в каталог вручную.</em></>}
      {result?.kind === "banner" && result.value.imageUrl && <><h2>Баннер готов</h2><img src={result.value.imageUrl} alt="Сгенерированный рекламный баннер" className="mt-3 w-full rounded-lg" /><em className="mt-4 block">Скачайте и вручную добавьте в акцию или витрину.</em></>}
    </aside>
  </div>;
}
